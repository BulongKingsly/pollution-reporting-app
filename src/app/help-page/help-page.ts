import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth-guard';

@Component({
  selector: 'app-help-page',
  imports: [RouterLink],
  templateUrl: './help-page.html',
  styleUrl: './help-page.css',
})
export class HelpPage {
  constructor(private auth: AuthService, private router: Router) {}

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
      await this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout failed', err);
      await this.router.navigate(['/login']);
    }
  }

}
