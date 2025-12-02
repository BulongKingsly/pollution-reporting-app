import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ReportsService } from '../services/reports';
import { BarangaysService } from '../services/barangays.service';
import { AuthService } from '../services/auth-guard';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css']
})
export class AnalyticsComponent implements OnInit {
  isMainAdmin = false;
  barangayId: string | null = null;
  selectedBarangay = '';
  barangays$!: Observable<any[]>;

  totalReports = 0;
  countsByType: Record<string, number> = {};
  pollutionTypes: string[] = [];
  last7Days: { label: string; count: number }[] = [];

  @ViewChild('barCanvas', { static: false }) barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas', { static: false }) pieCanvas!: ElementRef<HTMLCanvasElement>;

  private barChart: any = null;
  private pieChart: any = null;

  constructor(
    private reportsService: ReportsService,
    private barangaysService: BarangaysService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Initialize barangays observable
    this.barangays$ = this.barangaysService.getAllBarangays();

    // Check if we're viewing a specific barangay from route
    this.route.params.subscribe(params => {
      const routeBarangayId = params['barangayId'];

      this.auth.user$.pipe(
        map(u => {
          this.isMainAdmin = !!u && u.role === 'admin' && (!u.barangay || u.barangay === '');
          this.barangayId = routeBarangayId || u?.barangay || null;
          this.selectedBarangay = this.barangayId || '';
          return u;
        })
      ).subscribe(() => {
        this.loadAnalytics();
      });
    });
  }

  onBarangayChange(): void {
    this.barangayId = this.selectedBarangay || null;
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    const reports$ = this.isMainAdmin && !this.barangayId
      ? this.reportsService.getAllReports()
      : this.barangayId
      ? this.reportsService.getReportsByBarangay(this.barangayId)
      : this.reportsService.getAllReports();

    reports$.pipe(map(list => list || [])).subscribe(list => this.calculateMetrics(list));
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  private calculateMetrics(list: any[]) {
    this.totalReports = list.length;

    // Extract unique pollution types from reports
    const typeSet = new Set<string>();
    list.forEach(r => {
      const t = (r.type || r.pollutionType || '').toLowerCase();
      if (t) typeSet.add(t);
    });

    this.pollutionTypes = Array.from(typeSet).sort();

    // Initialize counts for all types
    this.countsByType = {};
    this.pollutionTypes.forEach(type => {
      this.countsByType[type] = 0;
    });

    const byDay: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0,10);
      byDay[key] = 0;
    }

    list.forEach(r => {
      const t = (r.type || r.pollutionType || '').toLowerCase();
      if (t && this.countsByType.hasOwnProperty(t)) this.countsByType[t]++;

      // normalize createdAt
      let created: Date | null = null;
      if (r.createdAt && typeof r.createdAt.toDate === 'function') created = r.createdAt.toDate();
      else if (r.createdAt instanceof Date) created = r.createdAt;
      else created = r.createdAt ? new Date(r.createdAt) : null;

      if (created) {
        const k = created.toISOString().slice(0,10);
        if (k in byDay) byDay[k]++;
      }
    });

    this.last7Days = Object.keys(byDay).map(k => ({ label: k.slice(5), count: byDay[k] }));

    // update charts
    const labels = this.last7Days.map(d => d.label);
    const data = this.last7Days.map(d => d.count);

    // ensure view initialized
    setTimeout(() => {
      try {
        if (!this.barChart && this.barCanvas) {
          this.barChart = new Chart(this.barCanvas.nativeElement.getContext('2d')!, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Reports', data: data, backgroundColor: '#0d6efd' }] },
            options: { responsive: true }
          });
        } else if (this.barChart) {
          this.barChart.data.labels = labels;
          this.barChart.data.datasets[0].data = data;
          this.barChart.update();
        }

        const pieLabels = this.pollutionTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        const pieData = this.pollutionTypes.map(t => this.countsByType[t] || 0);
        const colors = ['#198754', '#0dcaf0', '#ffc107', '#dc3545', '#6610f2', '#fd7e14'];

        if (!this.pieChart && this.pieCanvas) {
          this.pieChart = new Chart(this.pieCanvas.nativeElement.getContext('2d')!, {
            type: 'pie',
            data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: colors.slice(0, pieLabels.length) }] },
            options: { responsive: true }
          });
        } else if (this.pieChart) {
          this.pieChart.data.labels = pieLabels;
          this.pieChart.data.datasets[0].data = pieData;
          this.pieChart.data.datasets[0].backgroundColor = colors.slice(0, pieLabels.length);
          this.pieChart.update();
        }
      } catch (e) {
        // ignore chart initialization errors during server-side static checks
        console.warn('Chart init failed', e);
      }
    }, 0);
  }
}
