import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AppUser } from '../services/auth-guard';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
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

  constructor(
    private auth: AuthService,
    private router: Router,
    public translationService: TranslationService
  ) {}

  async onLogin() {
    this.errorMessage = '';

    try {
      // Sign in with Firebase Auth (supports both email and username)
      await this.auth.login(this.emailOrUsername, this.password);

      // Subscribe once to user$ to get Firestore user and redirect
      this.auth.user$.pipe(take(1)).subscribe((user: AppUser | null) => {
        if (!user) return;
        if (user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/home']);
        }
      });

    } catch (error: any) {
      this.errorMessage = error.message || 'Login failed';
    }
  }

  setLanguage(lang: Language) {
    this.translationService.setLanguage(lang);
  }
}
