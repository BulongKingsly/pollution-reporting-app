import { Component } from '@angular/core';
import { AuthService } from '../services/auth-guard';
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

  constructor(private auth: AuthService) {}

  async onReset() {
    if (!this.canSend) return;

    this.message = '';
    this.errorMessage = '';

    try {
      await this.auth.resetPassword(this.email);
      this.message = 'Reset link sent!';

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

    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to send reset link';
    }
  }
}
