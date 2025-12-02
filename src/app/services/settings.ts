import { Injectable } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { AuthService, AppUser } from './auth-guard';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(private firestore: Firestore, private authService: AuthService) {}

  getSettings(): Observable<AppUser['settings'] | null> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        const userDoc = doc(this.firestore, `users/${user.uid}`);
        return docData(userDoc, { idField: 'uid' }) as Observable<AppUser>;
      }),
      map(user => user?.settings || null) // use optional chaining
    );
  }
}
