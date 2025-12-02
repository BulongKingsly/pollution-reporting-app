import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where, addDoc, doc, updateDoc, deleteDoc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { serverTimestamp } from 'firebase/firestore';

export interface AppUserDoc {
  uid?: string;
  name?: string;
  email?: string | null;
  barangay?: string;
  role?: 'user' | 'barangay-admin' | 'main-admin';
  createdAt?: any;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private firestore: Firestore) {}

  /** Get user document by uid */
  getUserById(uid: string): Observable<AppUserDoc | undefined> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    return docData(userDoc) as Observable<AppUserDoc>;
  }

  /** Query users by barangay id */
  getUsersByBarangay(barangayId: string): Observable<(AppUserDoc & { id?: string })[]> {
    const usersCol = collection(this.firestore, 'users');
    const q = query(usersCol, where('barangay', '==', barangayId));
    return collectionData(q, { idField: 'id' }) as Observable<(AppUserDoc & { id?: string })[]>;
  }

  /** Get all users (for main admin) */
  getAllUsers(): Observable<(AppUserDoc & { id?: string })[]> {
    const usersCol = collection(this.firestore, 'users');
    return collectionData(usersCol, { idField: 'id' }) as Observable<(AppUserDoc & { id?: string })[]>;
  }

  /** Create a user document in Firestore. Note: creating an actual Firebase Auth user must be done via AuthService.register (server or client). */
  async createUserDoc(payload: AppUserDoc): Promise<void> {
    const usersCol = collection(this.firestore, 'users');
    // if payload.uid provided, set on that doc
    if (payload.uid) {
      const userRef = doc(this.firestore, `users/${payload.uid}`);
      await updateDoc(userRef, { ...payload, createdAt: payload.createdAt || serverTimestamp() }).catch(async () => {
        // if update fails (doc doesn't exist), try set via addDoc
        await addDoc(usersCol, { ...payload, createdAt: payload.createdAt || serverTimestamp() });
      });
      return;
    }
    await addDoc(usersCol, { ...payload, createdAt: payload.createdAt || serverTimestamp() });
  }

  /** Update a user document */
  async updateUser(uid: string, changes: Partial<AppUserDoc>): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, changes);
  }

  /** Delete user document (does not delete Firebase Auth user) */
  async deleteUser(uid: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await deleteDoc(userRef);
  }

  /** Set role for a user */
  async setRole(uid: string, role: AppUserDoc['role']): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, { role });
  }
}
