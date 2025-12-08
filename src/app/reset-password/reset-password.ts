import { Component } from '@angular/core';
import { AuthService } from '../services/auth-guard';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  imports: [RouterLink, FormsModule, CommonModule],
})
export class ResetPassword {
  email = '';
  message = '';
  errorMessage = '';
  cooldown = 60;
  canSend = true;
  isLoading = false;
  isInvalidEmail = false;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private functions: Functions
  ) {}

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Log reset request to Firestore
  private async logResetRequest(email: string, status: 'sent' | 'failed', errorMessage?: string): Promise<void> {
    try {
      const logsCollection = collection(this.firestore, 'password_reset_logs');
      await addDoc(logsCollection, {
        email,
        requestedAt: serverTimestamp(),
        status,
        errorMessage: errorMessage || null
      });
    } catch (error) {
      console.error('Failed to log reset request:', error);
    }
  }

  // Translate Firebase errors to user-friendly messages
  private translateFirebaseError(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with that email.';
      case 'auth/invalid-email':
        return 'Please enter a valid email.';
      case 'auth/too-many-requests':
        return 'Too many reset attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'Failed to send reset link. Please try again.';
    }
  }

  async onReset() {
    if (!this.canSend || this.isLoading) return;

    // Reset messages
    this.message = '';
    this.errorMessage = '';
    this.isInvalidEmail = false;

    // Trim whitespace
    this.email = this.email.trim();

    // Validate email
    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      this.isInvalidEmail = true;
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email.';
      this.isInvalidEmail = true;
      return;
    }

    this.isLoading = true;

    try {
      // Send password reset email via our custom Cloud Function
      console.log('Attempting to send reset email to:', this.email);
      const sendResetEmail = httpsCallable(this.functions, 'sendCustomPasswordResetEmail');
      const result = await sendResetEmail({ email: this.email });
      const data = result.data as any;

      if (data.success) {
        console.log('✅ Password reset email sent successfully');

        // Log success to Firestore
        await this.logResetRequest(this.email, 'sent');

        // Show success message
        this.message = data.message || 'A password reset link has been sent to your email. Check your spam folder if the reset link isn\'t in your inbox.';
        this.email = ''; // Clear email field

        // Start cooldown
        this.canSend = false;
        const interval = setInterval(() => {
          this.cooldown--;
          if (this.cooldown <= 0) {
            this.canSend = true;
            this.cooldown = 60;
            clearInterval(interval);
          }
        }, 1000);
      } else {
        this.errorMessage = data.error || 'Failed to send reset link. Please try again.';
        this.isInvalidEmail = true;
        await this.logResetRequest(this.email, 'failed', data.error);
      }

    } catch (error: any) {
      console.error('Reset password error:', error);
      this.errorMessage = 'Failed to send reset link. Please try again.';
      this.isInvalidEmail = true;

      // Log failure to Firestore
      await this.logResetRequest(this.email, 'failed', error.message);
    } finally {
      this.isLoading = false;
    }
  }

  // Check if form is valid
  get isFormValid(): boolean {
    return this.email.trim().length > 0 && this.isValidEmail(this.email.trim());
  }
}
