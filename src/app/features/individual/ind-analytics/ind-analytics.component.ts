import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoOrder, OrderStatus } from '../../../shared/models/order';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface MonthlyData { month: string; spent: number; count: number; }
interface CategoryData { name: string; spent: number; }
interface StoreData { name: string; spent: number; count: number; }

@Component({
  selector: 'app-ind-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ind-analytics.component.html',
  styleUrl: './ind-analytics.component.css'
})
export class IndAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private orderService = inject(OrderService);
  private toastService = inject(ToastService);

  @ViewChild('monthlyChart') monthlyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('storeChart') storeChartRef!: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  orders: DtoOrder[] = [];

  // Stats
  totalSpent = 0;
  totalOrders = 0;
  avgOrderValue = 0;
  last30DaysSpent = 0;
  last30DaysOrders = 0;

  // Chart data
  monthlyData: MonthlyData[] = [];
  categoryData: CategoryData[] = [];
  storeData: StoreData[] = [];

  private charts: Chart[] = [];
  private dataReady = false;
  private viewReady = false;

  ngOnInit(): void {
    this.loadOrders();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.dataReady) this.renderCharts();
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  loadOrders(): void {
    this.isLoading = true;
    this.orderService.getMyOrders({ pageNumber: 0, pageSize: 100 }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load analytics data.');
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(res => {
      this.orders = (res?.content || []).filter(o => o.status === OrderStatus.DELIVERED);
      this.computeStats();
      this.computeMonthly();
      this.computeCategories();
      this.computeStores();
      this.isLoading = false;
      this.dataReady = true;
      if (this.viewReady) {
        setTimeout(() => this.renderCharts(), 50);
      }
    });
  }

  computeStats(): void {
    this.totalOrders = this.orders.length;
    this.totalSpent = this.orders.reduce((s, o) => s + o.grandTotal, 0);
    this.avgOrderValue = this.totalOrders > 0 ? this.totalSpent / this.totalOrders : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = this.orders.filter(o => new Date(o.orderDate) >= thirtyDaysAgo);
    this.last30DaysSpent = recent.reduce((s, o) => s + o.grandTotal, 0);
    this.last30DaysOrders = recent.length;
  }

  computeMonthly(): void {
    const map = new Map<string, { spent: number; count: number }>();
    this.orders.forEach(o => {
      const d = new Date(o.orderDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = map.get(key) || { spent: 0, count: 0 };
      existing.spent += o.grandTotal;
      existing.count++;
      map.set(key, existing);
    });
    this.monthlyData = Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }

  computeCategories(): void {
    const map = new Map<string, number>();
    this.orders.forEach(o => {
      // Check subOrders first, then items
      const items = o.subOrders?.flatMap(s => s.items || []) || o.items || [];
      items.forEach(item => {
        const cat = 'General'; // We only have productName, no category in order items
        const existing = map.get(cat) || 0;
        map.set(cat, existing + item.price * item.quantity);
      });
    });

    // Use store-based grouping instead since we have storeName
    const storeMap = new Map<string, number>();
    this.orders.forEach(o => {
      if (o.subOrders && o.subOrders.length > 0) {
        o.subOrders.forEach(sub => {
          const name = sub.storeName || 'Unknown Store';
          storeMap.set(name, (storeMap.get(name) || 0) + sub.grandTotal);
        });
      } else {
        const name = o.storeName || 'Unknown Store';
        storeMap.set(name, (storeMap.get(name) || 0) + o.grandTotal);
      }
    });

    this.categoryData = Array.from(storeMap.entries())
      .map(([name, spent]) => ({ name, spent }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6);
  }

  computeStores(): void {
    const map = new Map<string, { spent: number; count: number }>();
    this.orders.forEach(o => {
      if (o.subOrders && o.subOrders.length > 0) {
        o.subOrders.forEach(sub => {
          const name = sub.storeName || 'Unknown';
          const existing = map.get(name) || { spent: 0, count: 0 };
          existing.spent += sub.grandTotal;
          existing.count++;
          map.set(name, existing);
        });
      } else {
        const name = o.storeName || 'Unknown';
        const existing = map.get(name) || { spent: 0, count: 0 };
        existing.spent += o.grandTotal;
        existing.count++;
        map.set(name, existing);
      }
    });
    this.storeData = Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }

  renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Monthly spending line chart
    if (this.monthlyChartRef && this.monthlyData.length > 0) {
      this.charts.push(new Chart(this.monthlyChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: this.monthlyData.map(d => d.month),
          datasets: [{
            label: 'Spending (₺)',
            data: this.monthlyData.map(d => d.spent),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#6366f1',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, callback: (v) => '₺' + v } }
          }
        }
      }));
    }

    // Store distribution doughnut
    if (this.categoryChartRef && this.categoryData.length > 0) {
      const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];
      this.charts.push(new Chart(this.categoryChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.categoryData.map(d => d.name),
          datasets: [{
            data: this.categoryData.map(d => d.spent),
            backgroundColor: colors.slice(0, this.categoryData.length),
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, padding: 16, usePointStyle: true } }
          }
        }
      }));
    }

    // Top stores bar chart
    if (this.storeChartRef && this.storeData.length > 0) {
      this.charts.push(new Chart(this.storeChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: this.storeData.map(d => d.name),
          datasets: [{
            label: 'Total Spent (₺)',
            data: this.storeData.map(d => d.spent),
            backgroundColor: 'rgba(99,102,241,0.7)',
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, callback: (v) => '₺' + v } },
            y: { grid: { display: false }, ticks: { color: textColor } }
          }
        }
      }));
    }
  }
}
