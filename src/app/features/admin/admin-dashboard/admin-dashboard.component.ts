import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { UserService } from '../../../core/services/user.service';
import { StoreService } from '../../../core/services/store.service';
import { CorporateApplicationService } from '../../../core/services/corporate-application.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoOrder, OrderStatus } from '../../../shared/models/order';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private orderService = inject(OrderService);
  private userService = inject(UserService);
  private storeService = inject(StoreService);
  private corpAppService = inject(CorporateApplicationService);
  private toastService = inject(ToastService);

  @ViewChild('orderTrendChart') orderTrendRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;

  isLoading = true;

  // Stats
  totalUsers = 0;
  totalOrders = 0;
  totalRevenue = 0;
  activeStores = 0;
  pendingApplications = 0;

  // Data
  allOrders: DtoOrder[] = [];
  allStores: any[] = [];
  recentOrders: DtoOrder[] = [];
  statusDistribution: { status: string; count: number; color: string }[] = [];
  dailyTrend: { date: string; count: number; revenue: number }[] = [];
  storePerformance: { id: number; name: string; revenue: number; orders: number }[] = [];

  private charts: Chart[] = [];
  private dataReady = false;
  private viewReady = false;

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.dataReady) setTimeout(() => this.renderCharts(), 50);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  loadAll(): void {
    this.isLoading = true;
    forkJoin({
      orders: this.orderService.getAllOrders({ pageNumber: 0, pageSize: 10000 }).pipe(catchError(() => of(null))),
      users: this.userService.findAllUsers({ pageNumber: 0, pageSize: 10000 }).pipe(catchError(() => of(null))),
      stores: this.storeService.getAllStores({ pageNumber: 0, pageSize: 10000 }).pipe(catchError(() => of(null))),
      apps: this.corpAppService.findRequestsByStatus('PENDING', { pageNumber: 0, pageSize: 10000 }).pipe(catchError(() => of(null)))
    }).subscribe(({ orders, users, stores, apps }) => {
      this.allOrders = orders?.content || [];
      this.allStores = stores?.content || [];
      this.totalUsers = users?.totalElement ?? (users?.content || []).length;
      this.activeStores = this.allStores.filter((s: any) => s.status === 'ACTIVE').length;
      this.pendingApplications = (apps?.content || []).length;

      // Master orders: parentOrderId is null/undefined
      const masterOrders = this.allOrders.filter(o => !o.parentOrderId);
      this.totalOrders = masterOrders.length;
      this.totalRevenue = masterOrders.reduce((s, o) => s + o.grandTotal, 0);

      this.computeRecent();
      this.computeStatusDistribution();
      this.computeDailyTrend();
      this.computeStorePerformance();

      this.isLoading = false;
      this.dataReady = true;
      if (this.viewReady) setTimeout(() => this.renderCharts(), 50);
    });
  }

  computeRecent(): void {
    this.recentOrders = [...this.allOrders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5);
  }

  computeStatusDistribution(): void {
    const map = new Map<string, number>();
    this.allOrders.forEach(o => {
      map.set(o.status, (map.get(o.status) || 0) + 1);
    });
    const colorMap: Record<string, string> = {
      PENDING: '#eab308', PAID: '#3b82f6', PARTIALLY_SHIPPED: '#8b5cf6',
      SHIPPED: '#a855f7', DELIVERED: '#22c55e', CANCELLED: '#ef4444'
    };
    this.statusDistribution = Array.from(map.entries()).map(([status, count]) => ({
      status, count, color: colorMap[status] || '#94a3b8'
    }));
  }

  computeDailyTrend(): void {
    const map = new Map<string, { count: number; revenue: number }>();
    const today = new Date();
    // Init last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map.set(key, { count: 0, revenue: 0 });
    }
    this.allOrders.forEach(o => {
      const key = new Date(o.orderDate).toISOString().split('T')[0];
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.count++;
        existing.revenue += o.grandTotal;
      }
    });
    this.dailyTrend = Array.from(map.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  computeStorePerformance(): void {
    const map = new Map<number, { revenue: number; orders: number }>();
    this.allOrders.forEach(o => {
      if (o.storeId && o.status !== OrderStatus.CANCELLED) {
        const current = map.get(o.storeId) || { revenue: 0, orders: 0 };
        current.revenue += o.grandTotal;
        current.orders++;
        map.set(o.storeId, current);
      }
    });

    this.storePerformance = this.allStores.map(s => {
        const stats = map.get(s.id) || { revenue: 0, orders: 0 };
        return {
            id: s.id,
            name: s.name,
            revenue: stats.revenue,
            orders: stats.orders
        };
    }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending
  }

  renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    if (this.orderTrendRef && this.dailyTrend.length > 0) {
      const labels = this.dailyTrend.map(d => {
        const parts = d.date.split('-');
        return `${parts[2]}/${parts[1]}`;
      });
      this.charts.push(new Chart(this.orderTrendRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Orders',
              data: this.dailyTrend.map(d => d.count),
              backgroundColor: 'rgba(99,102,241,0.7)',
              borderRadius: 6,
              borderSkipped: false,
              yAxisID: 'y'
            },
            {
              label: 'Revenue (₺)',
              data: this.dailyTrend.map(d => d.revenue),
              type: 'line',
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34,197,94,0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#22c55e',
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: textColor, usePointStyle: true } } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { position: 'left', grid: { color: gridColor }, ticks: { color: textColor } },
            y1: { position: 'right', grid: { display: false }, ticks: { color: '#22c55e', callback: (v) => '₺' + v } }
          }
        }
      }));
    }

    if (this.statusChartRef && this.statusDistribution.length > 0) {
      this.charts.push(new Chart(this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.statusDistribution.map(d => d.status),
          datasets: [{
            data: this.statusDistribution.map(d => d.count),
            backgroundColor: this.statusDistribution.map(d => d.color),
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, padding: 12, usePointStyle: true } }
          }
        }
      }));
    }
  }

  getStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING: return 'badge-pending';
      case OrderStatus.PAID: return 'badge-paid';
      case OrderStatus.SHIPPED: return 'badge-shipped';
      case OrderStatus.DELIVERED: return 'badge-delivered';
      case OrderStatus.CANCELLED: return 'badge-cancelled';
      default: return '';
    }
  }
}
