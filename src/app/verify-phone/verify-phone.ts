import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthService, AppUser } from '../services/auth-guard';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-verify-phone',
  templateUrl: './verify-phone.html',
  styleUrls: ['./verify-phone.css'],
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyPhoneComponent {
  user$: Observable<AppUser | null>;

  // Phone number input
  phoneNumber = signal('');

  // Verification code input (6 digits)
  verificationCode = signal('');

  // State signals
  codeSent = signal(false);
  isSendingCode = signal(false);
  isVerifying = signal(false);
  isVerified = signal(false);

  // Messages
  errorMessage = signal('');
  successMessage = signal('');

  // Countdown for resend
  resendCountdown = signal(0);
  private countdownInterval: any;

  constructor(
    private authService: AuthService,
    private functions: Functions,
    private firestore: Firestore,
    private router: Router,
    private notify: NotificationService
  ) {
    this.user$ = this.authService.user$;

    // Load existing phone number if any
    this.user$.pipe(take(1)).subscribe(user => {
      if (user?.phoneNumber) {
        this.phoneNumber.set(user.phoneNumber);
      }
      if ((user as any)?.phoneVerified) {
        this.isVerified.set(true);
      }
    });
  }

  formatPhoneNumber(value: string): string {
    // Remove non-numeric characters except +
    let formatted = value.replace(/[^\d+]/g, '');

    // Ensure Philippine format
    if (formatted.startsWith('09') && formatted.length <= 11) {
      return formatted;
    }
    if (formatted.startsWith('+63') && formatted.length <= 13) {
      return formatted;
    }
    if (formatted.startsWith('63') && formatted.length <= 12) {
      return '+' + formatted;
    }

    return formatted;
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatPhoneNumber(input.value);
    this.phoneNumber.set(formatted);
    input.value = formatted;
  }

  isValidPhoneNumber(): boolean {
    const phone = this.phoneNumber();
    // Philippine mobile: 09XXXXXXXXX (11 digits) or +639XXXXXXXXX (13 chars)
    return /^09\d{9}$/.test(phone) || /^\+639\d{9}$/.test(phone);
  }

  async sendVerificationCode() {
    if (!this.isValidPhoneNumber()) {
      this.errorMessage.set('Please enter a valid Philippine mobile number (09XXXXXXXXX)');
      return;
    }

    const user = await this.user$.pipe(take(1)).toPromise();
    if (!user) {
      this.errorMessage.set('Please log in to verify your phone number');
      return;
    }

    this.isSendingCode.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const sendCode = httpsCallable(this.functions, 'sendPhoneVerificationCode');
      const result = await sendCode({
        phoneNumber: this.phoneNumber(),
        uid: user.uid
      });

      const data = result.data as any;

      if (data.success) {
        this.codeSent.set(true);
        this.successMessage.set('Verification code sent! Check your SMS messages.');
        this.startResendCountdown();
      } else {
        this.errorMessage.set(data.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      this.errorMessage.set(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      this.isSendingCode.set(false);
    }
  }

  startResendCountdown() {
    this.resendCountdown.set(60);
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.countdownInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current > 0) {
        this.resendCountdown.set(current - 1);
      } else {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  onCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Only allow digits, max 6
    const value = input.value.replace(/\D/g, '').substring(0, 6);
    this.verificationCode.set(value);
    input.value = value;
  }

  async verifyCode() {
    const code = this.verificationCode();
    if (code.length !== 6) {
      this.errorMessage.set('Please enter the 6-digit verification code');
      return;
    }

    const user = await this.user$.pipe(take(1)).toPromise();
    if (!user) {
      this.errorMessage.set('Please log in to verify your phone number');
      return;
    }

    this.isVerifying.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const verifyCode = httpsCallable(this.functions, 'verifyPhoneCode');
      const result = await verifyCode({
        code: code,
        uid: user.uid
      });

      const data = result.data as any;

      if (data.success) {
        this.isVerified.set(true);
        this.successMessage.set('Phone number verified successfully!');
        this.notify.success('Phone number verified! You can now receive SMS notifications.', 'Verified');

        // Navigate back to settings after a short delay
        setTimeout(() => {
          this.router.navigate(['/settings']);
        }, 2000);
      } else {
        this.errorMessage.set(data.error || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      this.errorMessage.set(error.message || 'Failed to verify code. Please try again.');
    } finally {
      this.isVerifying.set(false);
    }
  }

  changePhoneNumber() {
    this.codeSent.set(false);
    this.verificationCode.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
