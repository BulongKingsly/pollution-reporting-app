import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AppUser } from '../services/auth-guard';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter, take } from 'rxjs/operators';
import { TranslationService, Language } from '../services/translation.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  imports: [RouterLink, CommonModule, FormsModule],
})
export class Login {
  emailOrUsername = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    public translationService: TranslationService
  ) {}

  async onLogin() {
    // Prevent double submission
    if (this.isLoading) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    try {
      // Sign in with Firebase Auth (supports both email and username)
      await this.auth.login(this.emailOrUsername, this.password);

      // Wait for user data to be available (filter out null values)
      this.auth.user$.pipe(
        filter((user): user is AppUser => user !== null),
        take(1)
      ).subscribe((user: AppUser) => {
        this.successMessage = 'Login successful! Redirecting...';
        setTimeout(() => {
          if (user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/']);
          }
        }, 500);
      });

    } catch (error: any) {
      this.errorMessage = error.message || 'Login failed';
      this.isLoading = false;
    }
  }

  setLanguage(lang: Language) {
    this.translationService.setLanguage(lang);
  }
}
