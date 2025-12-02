// src/app/services/users.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, updateDoc, docData, query, where } from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { AppUser } from '../interfaces';
import { AuthService } from './auth-guard';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(private firestore: Firestore, private auth: AuthService) {}

  /**
   * Ensure current user is authorized to act for a barangay.
   * If requireGlobal=true then only main-admin (no barangay) is allowed.
   */
  private async ensureAdminFor(barangayId?: string | null, requireGlobal = false) {
    const u = await firstValueFrom(this.auth.user$);
    if (!u || u.role !== 'admin') throw new Error('Unauthorized: admin required');
    const isGlobal = !u.barangay || u.barangay === '';
    if (requireGlobal) {
      if (!isGlobal) throw new Error('Unauthorized: main-admin required');
      return;
    }
    if (isGlobal) return;
    if (barangayId && u.barangay === barangayId) return;
    throw new Error('Unauthorized: admin for this barangay required');
  }

  /** Get all users */
  getAllUsers(): Observable<AppUser[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'uid' }) as Observable<AppUser[]>;
  }

  /** Get users by barangay id */
  getUsersByBarangay(barangayId: string): Observable<AppUser[]> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('barangay', '==', barangayId));
    return collectionData(q, { idField: 'uid' }) as Observable<AppUser[]>;
  }

  /** Update user role */
  async updateRole(uid: string, role: 'user' | 'admin'): Promise<void> {
    // fetch target user's barangay so we can allow local admins to promote within their barangay
    const targetRef = doc(this.firestore, `users/${uid}`);
    const target = await firstValueFrom(docData(targetRef) as Observable<AppUser>);
    const targetBarangay = (target && (target as any).barangay) || null;
    await this.ensureAdminFor(targetBarangay);
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, { role });
  }

  /** Suspend user (mark as inactive) */
  async suspendUser(uid: string): Promise<void> {
    // allow main-admin or barangay-admin for the target user's barangay
    const targetRef = doc(this.firestore, `users/${uid}`);
    const target = await firstValueFrom(docData(targetRef) as Observable<AppUser>);
    const targetBarangay = (target && (target as any).barangay) || null;
    await this.ensureAdminFor(targetBarangay);
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, { suspended: true });
  }

  /** Update user settings */
  async updateSettings(uid: string, settings: AppUser['settings']): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, { settings });
  }

  /** Set or change a user's barangay assignment */
  async setUserBarangay(uid: string, barangayId: string | null): Promise<void> {
    // allow main-admin or setting to your own barangay (local admin)
    await this.ensureAdminFor(barangayId);
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, { barangay: barangayId });
  }
}
