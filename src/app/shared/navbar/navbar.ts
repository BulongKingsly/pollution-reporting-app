import { Component, ChangeDetectionStrategy, input, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AppUser } from '../../interfaces';
import { AuthService } from '../../services/auth-guard';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationsService = inject(NotificationsService);

  // Input for active page
  activePage = input<string>('home');

  // User observable
  user$: Observable<AppUser | null>;

  // Unread notifications count
  unreadCount$!: Observable<number>;

  private subscription: Subscription | null = null;

  constructor() {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {
    // Subscribe to unread count when user is logged in
    this.subscription = this.user$.subscribe(user => {
      if (user) {
        this.unreadCount$ = this.notificationsService.getUnreadCount(user.uid);
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
