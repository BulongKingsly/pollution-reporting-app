import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth-guard';
import { map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate() {
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        if (user?.role === 'admin') return true;
        this.router.navigate(['/unauthorized']);
        return false;
      })
    );
  }
}
