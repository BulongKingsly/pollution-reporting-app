import { Component, OnInit } from '@angular/core';
import { AuthService, AppUser } from '../services/auth-guard';
import { BarangaysService } from '../services/barangays.service';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  imports: [FormsModule, CommonModule, RouterLink]
})
export class Profile implements OnInit {
  user$: Observable<AppUser | null>;
  barangayName$ = new Observable<string>();

  constructor(
    private auth: AuthService,
    private router: Router,
    private barangaysService: BarangaysService
  ) {
    this.user$ = this.auth.user$;
  }

  ngOnInit(): void {
    // Get barangay name based on user's barangay ID
    this.barangayName$ = this.user$.pipe(
      switchMap(user => {
        if (!user?.barangay) {
          return new Observable<string>(observer => {
            observer.next('Admin');
            observer.complete();
          });
        }
        return this.barangaysService.getAllBarangays().pipe(
          map(barangays => {
            const barangay = barangays.find(b => b.id === user.barangay);
            return barangay ? barangay.name : user.barangay;
          })
        );
      })
    );
  }

  async logout() {
    try {
      await this.auth.logout();
      await this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }
}
