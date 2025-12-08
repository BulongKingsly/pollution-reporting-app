import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Report, AppUser, Comment } from '../../interfaces';

export interface EnrichedReport extends Report {
  id?: string;
  reporterProfilePic?: string | null;
  createdAtDate?: Date;
}

@Component({
  selector: 'app-report-card',
  templateUrl: './report-card.html',
  styleUrls: ['./report-card.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportCardComponent {
  // Inputs
  report = input.required<EnrichedReport>();
  currentUser = input<AppUser | null>(null);
  isAdmin = input<boolean>(false);
  showAdminActions = input<boolean>(false);
  usersMap = input<Map<string, AppUser>>(new Map());

  // Outputs
  upvoteClick = output<EnrichedReport>();
  imageClick = output<string>();
  showMapClick = output<{ reportId: string; lat: number; lng: number }>();
  addCommentClick = output<{ reportId: string; text: string }>();
  statusChange = output<{ report: EnrichedReport; status: 'Pending' | 'In Progress' | 'Done' }>();
  deleteClick = output<EnrichedReport>();
  approveClick = output<EnrichedReport>();
  rejectClick = output<EnrichedReport>();

  // Local state for comment text
  commentText = '';

  getInitials(name: string): string {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getUserProfilePicture(userId: string): string | null {
    const user = this.usersMap().get(userId);
    return user?.profilePictureUrl || null;
  }

  formatTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(timestamp);
  }

  formatCommentDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  }

  onUpvote() {
    this.upvoteClick.emit(this.report());
  }

  onImageClick(img: string) {
    this.imageClick.emit(img);
  }

  onShowMap() {
    const r = this.report();
    if (r.id && r.lat && r.lng) {
      this.showMapClick.emit({ reportId: r.id, lat: r.lat, lng: r.lng });
    }
  }

  onAddComment() {
    const text = this.commentText.trim();
    if (text && this.report().id) {
      this.addCommentClick.emit({ reportId: this.report().id!, text });
      this.commentText = '';
    }
  }

  onStatusChange(status: 'Pending' | 'In Progress' | 'Done') {
    this.statusChange.emit({ report: this.report(), status });
  }

  onDelete() {
    this.deleteClick.emit(this.report());
  }

  onApprove() {
    this.approveClick.emit(this.report());
  }

  onReject() {
    this.rejectClick.emit(this.report());
  }

  getPollutionTypeClass(): string {
    const type = this.report().type?.toLowerCase();
    switch (type) {
      case 'water': return 'bg-info';
      case 'air': return 'bg-secondary';
      case 'land': return 'bg-warning text-dark';
      default: return 'bg-danger';
    }
  }

  getStatusClass(): string {
    const status = this.report().status;
    switch (status) {
      case 'Pending': return 'bg-warning text-dark';
      case 'In Progress': return 'bg-info';
      case 'Done': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(): string {
    const status = this.report().status;
    switch (status) {
      case 'Pending': return 'fa-clock';
      case 'In Progress': return 'fa-spinner';
      case 'Done': return 'fa-check-circle';
      default: return 'fa-question-circle';
    }
  }

  canUpvote(): boolean {
    const user = this.currentUser();
    const r = this.report();
    if (!user) return false;
    if (user.role === 'admin') return false;
    const upvotedBy = r.upvotedBy || [];
    return !upvotedBy.includes(user.uid);
  }
}
