import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BarangaysService, Barangay, Street } from '../services/barangays.service';
import { ReportsService } from '../services/reports';
import { UsersService } from '../services/users';
import { AnnouncementsService } from '../services/announcements';
import { AuthService } from '../services/auth-guard';
import { AppUser, Report } from '../interfaces';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-barangay-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './barangay-admin.html',
  styleUrls: ['./barangay-admin.css']
})
export class BarangayAdminComponent implements OnInit {
  barangayId: string | null = null;
  barangay: Barangay | null = null;
  reports: (Report & { id?: string })[] = [];
  users: (AppUser & { uid?: string })[] = [];

  newStreet = '';
  newStreetLat: number | null = null;
  newStreetLng: number | null = null;
  newType = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private barangaysService: BarangaysService,
    private reportsService: ReportsService,
    private usersService: UsersService,
    private announcementsService: AnnouncementsService,
    private auth: AuthService
  ) {}

  // simple toasts and confirm dialog handlers (local to this component)
  toasts: Array<{ id: number; message: string; type: 'info' | 'success' | 'warning' | 'danger' }> = [];
  private nextToastId = 1;

  confirmVisible = false;
  confirmMessage = '';
  private confirmResolve: ((v: boolean) => void) | null = null;

  showToast(message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') {
    const id = this.nextToastId++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 4000);
  }

  removeToast(id: number) { this.toasts = this.toasts.filter(t => t.id !== id); }

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

  ngOnInit(): void {
    this.barangayId = this.route.snapshot.paramMap.get('barangayId');
    if (!this.barangayId) return;

    // load barangay details
    this.barangaysService.getBarangayById(this.barangayId).subscribe(b => this.barangay = b || null);

    // load reports for barangay
    this.reportsService.getReportsByBarangay(this.barangayId).subscribe(r => this.reports = r as any || []);

    // load users in barangay
    this.usersService.getUsersByBarangay(this.barangayId).subscribe(u => this.users = u as any || []);
  }

  async addStreet() {
    if (!this.newStreet || !this.barangayId) return;

    // If coordinates are provided, add as Street object; otherwise as string
    const street: string | Street = (this.newStreetLat != null && this.newStreetLng != null)
      ? { name: this.newStreet.trim(), lat: this.newStreetLat, lng: this.newStreetLng }
      : this.newStreet.trim();

    await this.barangaysService.addStreet(this.barangayId, street);
    this.newStreet = '';
    this.newStreetLat = null;
    this.newStreetLng = null;
  }

  async addType() {
    if (!this.newType || !this.barangayId) return;
    await this.barangaysService.addPollutionType(this.barangayId, this.newType.trim());
    this.newType = '';
  }

  async removeStreet(street: string | Street) {
    if (!this.barangayId) return;
    await this.barangaysService.removeStreet(this.barangayId, street);
  }

  async removeType(type: string) {
    if (!this.barangayId) return;
    await this.barangaysService.removePollutionType(this.barangayId, type);
  }

  // Helper methods for displaying streets
  getStreetName(street: string | Street): string {
    return typeof street === 'string' ? street : street.name;
  }

  getStreetCoords(street: string | Street): string | null {
    if (typeof street === 'string') return null;
    if (street.lat != null && street.lng != null) {
      return `${street.lat.toFixed(6)}, ${street.lng.toFixed(6)}`;
    }
    return null;
  }

  // --- User actions for barangay admins ---
  async promoteUserToAdmin(user: AppUser) {
    if (!this.barangayId || !user?.uid) return;
    try {
      // set role to admin and set their barangay
      await this.usersService.updateRole(user.uid, 'admin');
      await this.usersService.setUserBarangay(user.uid, this.barangayId);
      this.showToast('User promoted to barangay admin', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Failed to promote user: ' + (e as any).message, 'danger');
    }
  }

  async demoteAdminToUser(user: AppUser) {
    if (!user?.uid) return;
    try {
      await this.usersService.updateRole(user.uid, 'user');
      // leave their barangay as-is (optional: clear barangay)
      this.showToast('Admin demoted to user', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Failed to demote admin: ' + (e as any).message, 'danger');
    }
  }

  async suspendUser(user: AppUser) {
    if (!user?.uid) return;
    const ok = await this.showConfirm('Suspend this user?');
    if (!ok) return;
    try {
      await this.usersService.suspendUser(user.uid);
      this.showToast('User suspended', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Failed to suspend user: ' + (e as any).message, 'danger');
    }
  }

  // Announcements for this barangay
  announcementModel: { title: string; description: string; subtitle?: string } = { title: '', description: '', subtitle: '' };

  async postBarangayAnnouncement() {
    if (!this.barangayId) { this.showToast('Barangay not loaded', 'warning'); return; }
    if (!this.announcementModel.title || !this.announcementModel.description) { this.showToast('Title and description required', 'warning'); return; }
    try {
      await this.announcementsService.createAnnouncement({
        title: this.announcementModel.title,
        subtitle: this.announcementModel.subtitle || '',
        description: this.announcementModel.description,
        barangayId: this.barangayId,
        location: this.barangay?.name || '',
        date: new Date()
      });
      this.announcementModel = { title: '', description: '', subtitle: '' };
      this.showToast('Announcement posted', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Failed to post announcement: ' + (e as any).message, 'danger');
    }
  }

  get currentUser$() {
    return this.auth.user$;
  }
}
