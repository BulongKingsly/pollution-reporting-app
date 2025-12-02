import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../services/reports';
import { AnnouncementsService } from '../services/announcements';
import { UsersService } from '../services/users';
import { BarangaysService, Barangay } from '../services/barangays.service';
import { AuthService } from '../services/auth-guard';
import { Firestore, collectionData, collection, doc, deleteDoc } from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppUser, Report, Announcement } from '../interfaces';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit {
  activeTab: 'reports' | 'announcements' | 'users' | 'analytics' | 'barangays' = 'reports';

  reports: (Report & { id?: string })[] = [];
  announcements: (Announcement & { id?: string })[] = [];
  users: (AppUser & { id?: string })[] = [];
  barangays: (Barangay & { id?: string })[] = [];
  user$: Observable<AppUser | null>;

  filterStatus: 'all' | 'Pending' | 'In Progress' | 'Done' = 'all';
  responseText: Record<string, string> = {};

  announcementModel: Partial<Announcement> = {
    title: '',
    subtitle: '',
    description: '',
    barangayId: undefined
  };

  constructor(
    private reportsService: ReportsService,
    private announcementsService: AnnouncementsService,
    private firestore: Firestore,
    private usersService: UsersService,
    private barangaysService: BarangaysService,
    private auth: AuthService,
    private router: Router
  ) {
    this.user$ = this.auth.user$;
  }

  // UI toasts and confirm dialog state (simple per-component implementation)
  toasts: Array<{ id: number; message: string; type: 'info' | 'success' | 'warning' | 'danger' }> = [];
  private nextToastId = 1;

  // confirm dialog
  confirmVisible = false;
  confirmMessage = '';
  private confirmResolve: ((v: boolean) => void) | null = null;

  showToast(message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') {
    const id = this.nextToastId++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 4000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  showConfirm(message: string): Promise<boolean> {
    this.confirmMessage = message;
    this.confirmVisible = true;
    return new Promise(resolve => { this.confirmResolve = resolve; });
  }

  onConfirmAnswer(answer: boolean) {
    this.confirmVisible = false;
    if (this.confirmResolve) this.confirmResolve(answer);
    this.confirmResolve = null;
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  ngOnInit(): void {
    this.loadReports();
    this.loadAnnouncements();
    this.loadUsers();
    this.loadBarangays();
    this.auth.user$.pipe(take(1)).subscribe((u: any) => {
      this.isMainAdmin = !!u && (u.role === 'admin') && (!u.barangay || u.barangay === '');
    });
  }

  isMainAdmin = false;

  setTab(tab: 'reports' | 'announcements' | 'users' | 'analytics' | 'barangays') {
    this.activeTab = tab;
  }

  // --- Reports ---
  loadReports() {
    this.auth.user$.pipe(take(1)).subscribe((currentUser: any) => {
      const isGlobalAdmin = currentUser?.role === 'admin' && (!currentUser.barangay || currentUser.barangay === '');

      if (isGlobalAdmin) {
        // Main admin sees all reports
        this.reportsService.getAllReports().subscribe(rs => {
          this.reports = rs;
        });
      } else if (currentUser?.barangay) {
        // Barangay admin sees only their barangay reports
        this.reportsService.getReportsByBarangay(currentUser.barangay).subscribe(rs => {
          this.reports = rs;
        });
      }
    });
  }

  filteredReports() {
    if (this.filterStatus === 'all') return this.reports;
    return this.reports.filter(r => r.status === this.filterStatus);
  }

  async updateStatus(report: Report & { id?: string }, status: 'Pending' | 'In Progress' | 'Done') {
    if (!report.id) return;
    await this.reportsService.updateReport(report.id, { status });
    const idx = this.reports.findIndex(r => r.id === report.id);
    if (idx >= 0) this.reports[idx].status = status;
  }

  async sendResponse(report: Report & { id?: string }, text: string) {
    if (!report.id) return;
    const adminResponse = { text, date: new Date().toISOString() };
    await this.reportsService.updateReport(report.id, { adminResponse });
    const idx = this.reports.findIndex(r => r.id === report.id);
    if (idx >= 0) this.reports[idx].adminResponse = adminResponse;
    this.responseText[report.id] = '';
  }

  async deleteReport(report: Report & { id?: string }) {
    if (!report.id) return;
    await this.reportsService.deleteReport(report.id); // implement in ReportsService
    this.reports = this.reports.filter(r => r.id !== report.id);
  }

  // --- Announcements ---
  loadAnnouncements() {
    this.auth.user$.pipe(take(1)).subscribe((currentUser: any) => {
      const isGlobalAdmin = currentUser?.role === 'admin' && (!currentUser.barangay || currentUser.barangay === '');

      if (isGlobalAdmin) {
        // Main admin sees all announcements
        this.announcementsService.getAllAnnouncements().subscribe(a => {
          this.announcements = a;
        });
      } else if (currentUser?.barangay) {
        // Barangay admin sees only their barangay announcements (plus global ones)
        this.announcementsService.getAnnouncementsForBarangay(currentUser.barangay).subscribe(a => {
          this.announcements = a;
        });
      }
    });
  }

  // --- Barangays ---
  loadBarangays() {
    this.auth.user$.pipe(take(1)).subscribe((currentUser: any) => {
      const isGlobalAdmin = currentUser?.role === 'admin' && (!currentUser.barangay || currentUser.barangay === '');

      if (isGlobalAdmin) {
        // Main admin sees all barangays
        this.barangaysService.getAllBarangays().subscribe(b => {
          this.barangays = b;
        });
      } else if (currentUser?.barangay) {
        // Barangay admin sees only their barangay
        this.barangaysService.getAllBarangays().subscribe(allBarangays => {
          this.barangays = allBarangays.filter(b => b.id === currentUser.barangay);
        });
      }
    });
  }

  /** Create a new barangay */
  async createBarangay(name: string) {
    if (!name || !name.trim()) { this.showToast('Provide barangay name', 'warning'); return; }
    try {
      await this.barangaysService.createBarangay({ name: name.trim() });
      this.loadBarangays();
      this.showToast('Barangay created', 'success');
    } catch (err) {
      console.error('Failed to create barangay', err);
      this.showToast('Failed to create barangay', 'danger');
    }
  }

  /** Assign an admin to a barangay: set role and add adminId to barangay */
  async assignAdminToBarangay(barangayId: string, userUid: string) {
    if (!barangayId || !userUid) return;
    try {
      await this.usersService.updateRole(userUid, 'admin');
      await this.usersService.setUserBarangay(userUid, barangayId);
      await this.barangaysService.assignAdmin(barangayId, userUid);
      this.showToast('Assigned admin to barangay', 'success');
      this.loadUsers();
      this.loadBarangays();
    } catch (err) {
      console.error('Failed to assign admin', err);
      this.showToast('Failed to assign admin: ' + ((err as any)?.message || ''), 'danger');
    }
  }

  /** Remove an admin from a barangay and downgrade role */
  async unassignAdminFromBarangay(barangayId: string, adminUid: string) {
    if (!confirm('Remove admin privileges from this user?')) return;
    try {
      await this.barangaysService.removeAdmin(barangayId, adminUid);
      // downgrade user role to 'user' and clear barangay assignment
      await this.usersService.updateRole(adminUid, 'user');
      await this.usersService.setUserBarangay(adminUid, null);
      alert('Admin removed');
      this.loadUsers();
      this.loadBarangays();
    } catch (err) {
      console.error('Failed to remove admin', err);
      alert('Failed to remove admin');
    }
  }

  async removeBarangay(barangayId: string) {
    const ok = await this.showConfirm('Delete this barangay? This action cannot be undone.');
    if (!ok) return;
    try {
      await this.barangaysService.deleteBarangay(barangayId);
      this.loadBarangays();
      this.showToast('Barangay deleted', 'success');
    } catch (err) {
      console.error('Failed to delete barangay', err);
      this.showToast('Failed to delete barangay: ' + ((err as any)?.message || ''), 'danger');
    }
  }

  /** Navigate to barangay-scoped analytics */
  openBarangayAnalytics(barangayId: string) {
    if (!barangayId) return;
    this.router.navigate(['/admin/barangay', barangayId, 'analytics']);
  }

  /** Users that can be assigned as admins (non-admins) */
  get assignableUsers() {
    return (this.users || []).filter(u => !u.role || u.role !== 'admin');
  }

  getUserEmail(uid: string) {
    const u = (this.users || []).find(x => x.uid === uid);
    return u ? u.email : uid;
  }

  getBarangayName(barangayId: string | null | undefined): string {
    if (!barangayId) return 'Admin';
    const barangay = this.barangays.find(b => b.id === barangayId);
    return barangay ? barangay.name : barangayId;
  }

  async postAnnouncement(payload: Partial<Announcement>) {
    if (!payload.title || !payload.description) { this.showToast('Title and description required', 'warning'); return; }
    try {
      // Get current user to determine barangayId
      const currentUser = await firstValueFrom(this.auth.user$);
      const isGlobalAdmin = currentUser?.role === 'admin' && (!currentUser.barangay || currentUser.barangay === '');

      // For main admin, use the selected barangayId from model (null means global)
      // For barangay admin, always use their barangay
      const barangayId = isGlobalAdmin ? (payload.barangayId || null) : currentUser?.barangay || null;

      await this.announcementsService.postAnnouncement({
        title: payload.title,
        subtitle: payload.subtitle || '',
        description: payload.description,
        location: payload.location || '',
        date: new Date(),
        createdAt: new Date(),
        barangayId: barangayId
      } as Announcement);
      this.announcementModel = { title: '', subtitle: '', description: '', barangayId: undefined };
      this.loadAnnouncements();
      this.showToast('Announcement posted', 'success');
    } catch (err) {
      console.error('Failed to post announcement', err);
      this.showToast('Failed to post announcement: ' + ((err as any)?.message || ''), 'danger');
    }
  }

  // --- Users ---
  loadUsers() {
    this.auth.user$.pipe(take(1)).subscribe((currentUser: any) => {
      const isGlobalAdmin = currentUser?.role === 'admin' && (!currentUser.barangay || currentUser.barangay === '');

      if (isGlobalAdmin) {
        // Main admin sees all users
        this.usersService.getAllUsers().subscribe((u: AppUser[]) => {
          this.users = u;
        });
      } else if (currentUser?.barangay) {
        // Barangay admin sees only their barangay users
        this.usersService.getUsersByBarangay(currentUser.barangay).subscribe((u: AppUser[]) => {
          this.users = u;
        });
      }
    });
  }

  /** Change a user's role (admin/user) */
  async changeUserRole(user: AppUser, role: 'user' | 'admin') {
    if (!user?.uid) return;
    try {
      await this.usersService.updateRole(user.uid, role);
      user.role = role;
    } catch (err) {
      console.error('Failed to update role', err);
      alert('Failed to update role');
    }
  }

  /** Suspend a user (mark suspended true in firestore) */
  async suspendUserAction(user: AppUser) {
    if (!user?.uid) return;
    try {
      await this.usersService.suspendUser(user.uid);
      // optional: mark locally to reflect change
      (user as any).suspended = true;
    } catch (err) {
      console.error('Failed to suspend user', err);
      alert('Failed to suspend user');
    }
  }

  /** Delete announcement by id (if present) */
  async deleteAnnouncement(a: Announcement) {
    if (!a?.id) return;
    try {
      const announcementDoc = doc(this.firestore, `announcements/${a.id}`);
      await deleteDoc(announcementDoc);
      this.announcements = this.announcements.filter(x => x.id !== a.id);
    } catch (err) {
      console.error('Failed to delete announcement', err);
      alert('Failed to delete announcement');
    }
  }

  // Analytics helpers used in template
  get totalReports() {
    return this.reports?.length || 0;
  }

  get pendingCount() {
    return this.reports?.filter(r => r.status === 'Pending').length || 0;
  }

  get inProgressCount() {
    return this.reports?.filter(r => r.status === 'In Progress').length || 0;
  }

  get doneCount() {
    return this.reports?.filter(r => r.status === 'Done').length || 0;
  }

  // Group users by barangay (for main admin display)
  get usersByBarangay(): Record<string, AppUser[]> {
    const grouped: Record<string, AppUser[]> = {};
    this.users.forEach(u => {
      let barangayName = 'Admin';

      if (u.barangay) {
        // Find the barangay name from barangays list
        const barangay = this.barangays.find(b => b.id === u.barangay);
        barangayName = barangay ? barangay.name : u.barangay;
      }

      if (!grouped[barangayName]) grouped[barangayName] = [];
      grouped[barangayName].push(u);
    });
    return grouped;
  }

  // Get barangay names for users grouping
  get barangayKeys(): string[] {
    return Object.keys(this.usersByBarangay).sort((a, b) => {
      // Put 'Admin' first
      if (a === 'Admin') return -1;
      if (b === 'Admin') return 1;
      return a.localeCompare(b);
    });
  }

  // Group announcements by barangay (for main admin display)
  get announcementsByBarangay(): Record<string, (Announcement & { id?: string })[]> {
    const grouped: Record<string, (Announcement & { id?: string })[]> = {};
    this.announcements.forEach(a => {
      let barangayName = 'Global';

      if (a.barangayId) {
        // Find the barangay name from barangays list
        const barangay = this.barangays.find(b => b.id === a.barangayId);
        barangayName = barangay ? barangay.name : a.barangayId;
      }

      if (!grouped[barangayName]) grouped[barangayName] = [];
      grouped[barangayName].push(a);
    });
    return grouped;
  }

  // Get barangay names for announcements grouping
  get announcementBarangayKeys(): string[] {
    return Object.keys(this.announcementsByBarangay).sort((a, b) => {
      // Put 'Global' first
      if (a === 'Global') return -1;
      if (b === 'Global') return 1;
      return a.localeCompare(b);
    });
  }

  // Group reports by barangay (for main admin display)
  get reportsByBarangay(): Record<string, (Report & { id?: string })[]> {
    const grouped: Record<string, (Report & { id?: string })[]> = {};
    const filtered = this.filteredReports();
    filtered.forEach(r => {
      const barangay = r.barangayId || 'No Barangay';
      if (!grouped[barangay]) grouped[barangay] = [];
      grouped[barangay].push(r);
    });
    return grouped;
  }

  // Get barangay names for reports grouping
  get reportBarangayKeys(): string[] {
    return Object.keys(this.reportsByBarangay).sort();
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
