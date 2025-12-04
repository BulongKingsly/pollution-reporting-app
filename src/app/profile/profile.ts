import { Component, OnInit } from '@angular/core';
import { AuthService, AppUser } from '../services/auth-guard';
import { BarangaysService } from '../services/barangays.service';
import { ReportsService } from '../services/reports';
import { Report } from '../interfaces';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  imports: [FormsModule, CommonModule, RouterLink]
})
export class Profile implements OnInit {
  user$: Observable<AppUser | null>;
  barangayName$ = new Observable<string>();
  uploadingImage = false;
  currentUser: AppUser | null = null;

  // User report statistics
  totalUserReports$!: Observable<number>;
  pendingUserReports$!: Observable<number>;
  inProgressUserReports$!: Observable<number>;
  resolvedUserReports$!: Observable<number>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private barangaysService: BarangaysService,
    private reportsService: ReportsService,
    private storage: Storage,
    private firestore: Firestore
  ) {
    this.user$ = this.auth.user$;
  }

  ngOnInit(): void {
    // Get barangay name based on user's barangay ID
    this.barangayName$ = this.user$.pipe(
      switchMap(user => {
        this.currentUser = user;
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

    // Calculate user's report statistics
    const userReports$: Observable<Report[]> = this.user$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        return this.reportsService.getAllReports().pipe(
          map(reports => reports.filter(r => (r as any).reporterId === user.uid))
        );
      })
    );

    this.totalUserReports$ = userReports$.pipe(
      map(reports => reports.length)
    );

    this.pendingUserReports$ = userReports$.pipe(
      map(reports => reports.filter(r => r.status === 'Pending').length)
    );

    this.inProgressUserReports$ = userReports$.pipe(
      map(reports => reports.filter(r => r.status === 'In Progress').length)
    );

    this.resolvedUserReports$ = userReports$.pipe(
      map(reports => reports.filter(r => r.status === 'Done').length)
    );
  }

  async onProfilePictureChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.currentUser) return;

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      this.uploadingImage = true;

      // Create a unique filename
      const timestamp = Date.now();
      const filename = `profile-pictures/${this.currentUser.uid}_${timestamp}`;
      const storageRef = ref(this.storage, filename);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update user document in Firestore
      const userRef = doc(this.firestore, `users/${this.currentUser.uid}`);
      await updateDoc(userRef, {
        profilePictureUrl: downloadURL
      });

      this.uploadingImage = false;
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      this.uploadingImage = false;
      alert('Failed to upload profile picture. Please try again.');
    }
  }

  async logout() {
    try {
      await this.auth.logout();
      await this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }

  toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  }
}
