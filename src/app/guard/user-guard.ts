import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, AppUser } from '../services/auth-guard';
import { map } from 'rxjs/operators';

/**
 * Guard to block only admin users (allows non-authenticated and regular users)
 */
export const UserGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    map((user: AppUser | null) => {
      // Allow if user is null (not logged in) or if user is not an admin
      if (!user || user.role !== 'admin') {
        return true;
      }
      // Redirect admins to home
      router.navigate(['/home']);
      return false;
    })
  );
};
