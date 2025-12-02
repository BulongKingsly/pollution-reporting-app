import { Injectable } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth-guard';
import { map, take } from 'rxjs/operators';

export const BarangayAdminGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      // user must be admin and either be global admin (no barangay) or match the barangay route param
      const requiredBarangay = route.paramMap.get('barangayId') || null;
      const isAdmin = user.role === 'admin';
      const isGlobalAdmin = !user.barangay;
      const isLocalAdmin = user.barangay && requiredBarangay && user.barangay === requiredBarangay;
      if (isAdmin && (isGlobalAdmin || isLocalAdmin)) return true;
      router.navigate(['/unauthorized']);
      return false;
    })
  );
};
