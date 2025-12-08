import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, Timestamp, getDocs } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppNotification } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private firestore = inject(Firestore);

  /**
   * Get notifications for a specific user
   */
  getUserNotifications(userId: string, limitCount: number = 50): Observable<AppNotification[]> {
    if (!userId) return of([]);

    const notificationsRef = collection(this.firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return collectionData(q, { idField: 'id' }) as Observable<AppNotification[]>;
  }

  /**
   * Get unread notification count for a user
   */
  getUnreadCount(userId: string): Observable<number> {
    if (!userId) return of(0);

    const notificationsRef = collection(this.firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    return (collectionData(q) as Observable<AppNotification[]>).pipe(
      map(notifications => notifications.length)
    );
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notificationsRef = collection(this.firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const batch = writeBatch(this.firestore);
      snapshot.docs.forEach(docSnapshot => {
        batch.update(docSnapshot.ref, { read: true });
      });
      await batch.commit();
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    await deleteDoc(notificationRef);
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    const notificationsRef = collection(this.firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const batch = writeBatch(this.firestore);
      snapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'new_report':
        return 'fas fa-file-alt text-primary';
      case 'report_status':
        return 'fas fa-sync-alt text-info';
      case 'report_accepted':
        return 'fas fa-check-circle text-success';
      case 'report_approved':
        return 'fas fa-check-circle text-success';
      case 'report_in_progress':
        return 'fas fa-spinner text-info';
      case 'report_done':
        return 'fas fa-check-double text-success';
      case 'report_rejected':
        return 'fas fa-times-circle text-danger';
      case 'upvote':
        return 'fas fa-thumbs-up text-success';
      case 'comment':
        return 'fas fa-comment text-primary';
      case 'admin_comment':
        return 'fas fa-comment-dots text-info';
      case 'admin_response':
        return 'fas fa-reply text-purple';
      case 'announcement':
        return 'fas fa-bullhorn text-warning';
      default:
        return 'fas fa-bell text-secondary';
    }
  }

  /**
   * Format notification time
   */
  formatTime(timestamp: any): string {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }
}
