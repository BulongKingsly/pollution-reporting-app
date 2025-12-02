import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, switchMap, firstValueFrom } from 'rxjs';
import { AnnouncementsService } from '../services/announcements';
import { AuthService } from '../services/auth-guard';
import { Announcement, AppUser } from '../interfaces';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.html',
  styleUrls: ['./announcements.css']
})
export class AnnouncementsComponent implements OnInit {
  announcements$: Observable<(Announcement & { id?: string })[]> | null = null;
  user$: Observable<AppUser | null>;

  // simple form model
  model: Partial<Announcement> = {
    title: '',
    subtitle: '',
    description: '',
    location: 'all'
  };

  constructor(private announcementsService: AnnouncementsService, private auth: AuthService) {
    this.user$ = this.auth.user$;
  }

  ngOnInit(): void {
    this.announcements$ = this.user$.pipe(
      switchMap(u => this.announcementsService.getAnnouncementsForBarangay(u?.barangay || null))
    );
  }

  async post() {
    const current = await firstValueFrom(this.auth.user$).catch(() => null as AppUser | null);
    const userBarangay = current?.barangay || null;
    if (!this.model.title || !this.model.description) {
      alert('Title and description required');
      return;
    }
    const target = this.model.location || 'all';
    const barangayId = target === 'local' ? userBarangay : null;
    try {
      await this.announcementsService.createAnnouncement({
        title: this.model.title!,
        subtitle: this.model.subtitle || '',
        description: this.model.description!,
        location: target,
        date: this.model.date || new Date(),
        barangayId: barangayId
      });
      this.model = { title: '', subtitle: '', description: '', location: 'all' };
    } catch (err) {
      console.error('Failed to post announcement', err);
      alert('Failed to post announcement');
    }
  }
}
