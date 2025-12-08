import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, authState, User as FirebaseUser, sendPasswordResetEmail } from '@angular/fire/auth';
import { Firestore, doc, setDoc, docData, updateDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Observable, of, switchMap, take, shareReplay } from 'rxjs';

export interface AppUser {
  uid: string;
  email: string | null;
  username?: string;  // Unique username
  fullName?: string;  // Full name from sign-up
  contact?: string;  // Contact number
  phoneNumber?: string;  // Phone number (contact only)
  emailVerified?: boolean;  // Whether email is verified for notifications
  address?: string;  // Physical address
  profilePictureUrl?: string;  // Profile picture URL
  role: 'user' | 'admin';
  createdAt: any;
  barangay: string;
  suspended?: boolean;  // User suspension status
  settings?: {
    language: 'english' | 'filipino';
    textSize: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      announcement: boolean;
      upvote: boolean;
      reportStatus: boolean;
      passwordChange: boolean;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  public user$: Observable<AppUser | null>;

  constructor(private auth: Auth, private firestore: Firestore) {
    this.user$ = authState(this.auth).pipe(
      switchMap((firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const userDoc = doc(this.firestore, `users/${firebaseUser.uid}`);
          return docData(userDoc) as Observable<AppUser>;
        } else {
          return of(null);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  async register(email: string, password: string, role: 'user' | 'admin' = 'user', barangay: string = '', fullName?: string, contact?: string, address?: string, username?: string): Promise<void> {
    // Double-check username uniqueness before creating account
    if (username) {
      const exists = await this.checkUsernameExists(username);
      if (exists) {
        throw new Error('Username already taken. Please choose a different one.');
      }
    }

    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const userRef = doc(this.firestore, `users/${credential.user.uid}`);
    await setDoc(userRef, {
      uid: credential.user.uid,
      email: credential.user.email,
      username: username || '',
      fullName: fullName || '',
      contact: contact || '',
      phoneNumber: '',
      address: address || '',
      role,
      barangay,
      createdAt: new Date(),
      settings: {
        language: 'english',
        textSize: 'medium',
        theme: 'light',
        notifications: {
          email: true,
          announcement: true,
          upvote: true,
          reportStatus: true,
          passwordChange: true
        }
      }
    });
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    if (!username) return false;

    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('username', '==', username));
    const querySnapshot = await getDocs(q);

    return !querySnapshot.empty;
  }

  async login(emailOrUsername: string, password: string): Promise<void> {
    let email = emailOrUsername;

    // Check if input is a username (not an email format)
    if (!emailOrUsername.includes('@')) {
      // Query Firestore to find user by username
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('username', '==', emailOrUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No user found with this username.');
      }

      // Get the email from the user document
      const userDoc = querySnapshot.docs[0].data() as AppUser;
      email = userDoc.email || '';

      if (!email) {
        throw new Error('No email associated with this username.');
      }
    } else {
      // Check if email exists in Firestore
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('email', '==', emailOrUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No user found with this email.');
      }
    }

    // Sign in with email
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);

      // Check if user is suspended
      const userDoc = doc(this.firestore, `users/${credential.user.uid}`);
      const userData = await docData(userDoc).pipe(take(1)).toPromise() as AppUser & { suspended?: boolean };

      if (userData?.suspended === true) {
        await signOut(this.auth); // Immediately sign out
        throw new Error('Your account has been suspended. Please contact the administrator.');
      }
    } catch (error: any) {
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No user found with this email.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email format.');
      } else if (error.message) {
        throw error; // Re-throw our custom errors
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async updateSettings(uid: string, settings: AppUser['settings']): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, { settings });
  }

  async updateProfile(uid: string, updates: { username?: string; fullName?: string; contact?: string; address?: string; profilePictureUrl?: string }): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, updates);
  }

  getCurrentUserSync(): AppUser | null {
    let currentUser: AppUser | null = null;
    this.user$.pipe(take(1)).subscribe(user => currentUser = user);
    return currentUser;
  }
}
