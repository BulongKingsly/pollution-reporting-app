import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, query, orderBy, doc, deleteDoc } from '@angular/fire/firestore';
import { Announcement } from '../interfaces';
import { serverTimestamp } from 'firebase/firestore';
import { Observable, map, firstValueFrom } from 'rxjs';
import { AuthService } from './auth-guard';

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  constructor(private firestore: Firestore, private auth: AuthService) {}

  private async ensureCanPost(barangayId?: string | null) {
    const u = await firstValueFrom(this.auth.user$);
    if (!u || u.role !== 'admin') throw new Error('Unauthorized: admin required');
    // global admins (no barangay) can post everywhere
    if (!u.barangay) return;
    // barangay admins can only post for their barangay
    if (barangayId && barangayId === u.barangay) return;
    throw new Error('Unauthorized: cannot post announcement for this barangay');
  }

  /** Get all announcements (latest first) */
  getAllAnnouncements(): Observable<(Announcement & { id?: string })[]> {
    const col = collection(this.firestore, 'announcements');
    const q = query(col, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<(Announcement & { id?: string })[]>;
  }

  /** Get announcements relevant to a barangay (or global if barangayId is null/undefined)
   * Implementation: fetches all and filters on the client so we can include global announcements.
   */
  getAnnouncementsForBarangay(barangayId?: string | null): Observable<(Announcement & { id?: string })[]> {
    return this.getAllAnnouncements().pipe(
      map(list => list.filter(a => !a.barangayId || a.barangayId === barangayId))
    );
  }

  /** Create an announcement (optionally scoped to a barangay) */
  async createAnnouncement(payload: {
    title: string;
    subtitle?: string;
    description: string;
    date?: any;
    location?: string;
    barangayId?: string | null;
  }) {
    await this.ensureCanPost(payload.barangayId);
    const col = collection(this.firestore, 'announcements');
    const docData = {
      title: payload.title,
      subtitle: payload.subtitle || '',
      description: payload.description,
      date: payload.date || null,
      location: payload.location || '',
      barangayId: payload.barangayId || null,
      createdAt: serverTimestamp()
    };
    await addDoc(col, docData as any);
  }

  /** Alias used by some components */
  async postAnnouncement(payload: Partial<Announcement>) {
    return this.createAnnouncement(payload as any);
  }

  /** Delete an announcement by id */
  async deleteAnnouncement(id: string) {
    const d = doc(this.firestore, `announcements/${id}`);
    await deleteDoc(d);
  }
}
