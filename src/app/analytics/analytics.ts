import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReportsService } from '../services/reports';
import { AuthService } from '../services/auth-guard';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import Chart from 'chart.js/auto';
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css']
})
export class AnalyticsComponent implements OnInit {
  isMainAdmin = false;
  barangayId: string | null = null;

  totalReports = 0;
  countsByType: Record<string, number> = { water: 0, air: 0, land: 0 };
  last7Days: { label: string; count: number }[] = [];

  @ViewChild('barCanvas', { static: false }) barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas', { static: false }) pieCanvas!: ElementRef<HTMLCanvasElement>;

  private barChart: any = null;
  private pieChart: any = null;

  constructor(
    private reportsService: ReportsService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.user$.pipe(
      map(u => {
        this.isMainAdmin = !!u && u.role === 'admin' && (!u.barangay || u.barangay === '');
        this.barangayId = u?.barangay || null;
        return u;
      })
    ).subscribe(u => {
      // choose reports stream based on role
      const reports$ = this.isMainAdmin ? this.reportsService.getAllReports() : (this.barangayId ? this.reportsService.getReportsByBarangay(this.barangayId) : this.reportsService.getAllReports());

      reports$.pipe(map(list => list || [])).subscribe(list => this.calculateMetrics(list));
    });
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  private calculateMetrics(list: any[]) {
    this.totalReports = list.length;
    // reset counts
    this.countsByType = { water: 0, air: 0, land: 0 } as any;

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

        const orderedTypes = ['water', 'air', 'land'];
        const pieData = orderedTypes.map(t => this.countsByType[t] || 0);

        if (!this.pieChart && this.pieCanvas) {
          this.pieChart = new Chart(this.pieCanvas.nativeElement.getContext('2d')!, {
            type: 'pie',
            data: { labels: ['Water', 'Air', 'Land'], datasets: [{ data: pieData, backgroundColor: ['#198754', '#0dcaf0', '#ffc107'] }] },
            options: { responsive: true }
          });
        } else if (this.pieChart) {
          this.pieChart.data.datasets[0].data = pieData;
          this.pieChart.update();
        }
      } catch (e) {
        // ignore chart initialization errors during server-side static checks
        console.warn('Chart init failed', e);
      }
    }, 0);
  }
}
