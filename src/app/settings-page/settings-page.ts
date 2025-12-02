import { Component } from '@angular/core';
import { AuthService, AppUser } from '../services/auth-guard';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings-page.html',
  styleUrls: ['./settings-page.css'],
  imports: [FormsModule, CommonModule, RouterLink]
})
export class SettingsPage {
  user$: Observable<AppUser | null>;
  settings = {
    language: 'english',
    textSize: 'medium',
    theme: 'light',
    notifications: { email: true, announcement: true, upvote: true }
  };
  toasts: { message: string; type: string }[] = [];

  constructor(private auth: AuthService, private firestore: Firestore, private router: Router) {
    this.user$ = this.auth.user$;
    this.user$.pipe(take(1)).subscribe(user => {
      if (user?.settings) {
        this.settings = user.settings;
        this.applySettings();
      } else {
        // fallback to localStorage
        const local = localStorage.getItem('userSettings');
        if (local) {
          this.settings = JSON.parse(local);
          this.applySettings();
        }
      }
    });
  }

  async saveSettings() {
    const user = await this.user$.pipe(take(1)).toPromise();
    if (!user) return;
    const userRef = doc(this.firestore, `users/${user.uid}`);
    await updateDoc(userRef, { settings: this.settings });
    localStorage.setItem('userSettings', JSON.stringify(this.settings));
    this.applySettings();
    this.showToast('Settings saved successfully!', 'success');
  }

  showToast(message: string, type: string) {
    const toast = { message, type };
    this.toasts.push(toast);
    setTimeout(() => this.removeToast(toast), 4000);
  }

  removeToast(toast: { message: string; type: string }) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }

  async logout() {
    try {
      await this.auth.logout();
      await this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }

  applySettings() {
    // Language: set a global attribute or use a translation service (stub)
    document.documentElement.lang = this.settings.language === 'filipino' ? 'fil' : 'en';

    // Text size: apply a class to body
    document.body.classList.remove('text-small', 'text-medium', 'text-large');
    document.body.classList.add(`text-${this.settings.textSize}`);

    // Theme: apply a class to body
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${this.settings.theme}`);
  }
}
