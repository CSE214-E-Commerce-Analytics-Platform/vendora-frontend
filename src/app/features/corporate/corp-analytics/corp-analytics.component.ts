import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { Store } from '../../../shared/models/store';
import { DtoOrder, OrderStatus } from '../../../shared/models/order';
import { Product } from '../../../shared/models/product';
import { DtoCustomerAnalytics } from '../../../shared/models/analytics';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-corp-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './corp-analytics.component.html',
  styleUrl: './corp-analytics.component.css'
})
export class CorpAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private storeService = inject(StoreService);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private toastService = inject(ToastService);
  private analyticsService = inject(AnalyticsService);

  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsChart') topProductsRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('orderStatusChart') orderStatusRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('customerSegmentsChart') customerSegmentsRef!: ElementRef<HTMLCanvasElement>;

  stores: Store[] = [];
  selectedStoreId: number | null = null;
  isLoading = false;

  // Date Range Filter
  startDate: string = '';
  endDate: string = '';
  rawOrders: DtoOrder[] = [];
  rawProducts: Product[] = [];

  // Drill-down
  selectedMonth: string | null = null;
  selectedMonthOrders: DtoOrder[] = [];

  // Analytics
  customerAnalytics: DtoCustomerAnalytics | null = null;

  // Stats
  totalProducts = 0;
  lowStockCount = 0;
  totalOrders = 0;
  totalRevenue = 0;
  avgOrderValue = 0;

  // Chart data
  monthlyRevenue: { month: string; revenue: number; count: number }[] = [];
  topProducts: { name: string; sold: number; revenue: number }[] = [];
  statusDist: { status: string; count: number; color: string }[] = [];

  private charts: Chart[] = [];
  private viewReady = false;

  ngOnInit(): void {
    this.loadStore();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  loadStore(): void {
    this.storeService.getMyStores({ pageNumber: 0, pageSize: 10 }).pipe(
      catchError(() => { this.toastService.showError('Failed to load store.'); return of(null); })
    ).subscribe(res => {
      const stores = res?.content || [];
      if (stores.length > 0) {
        this.selectedStoreId = stores[0].id;
        this.loadStoreData(this.selectedStoreId);
      }
    });
  }

  loadStoreData(storeId: number): void {
    this.isLoading = true;
    forkJoin({
      orders: this.orderService.getStoreOrders(storeId, { pageNumber: 0, pageSize: 100 }).pipe(catchError(() => of(null))),
      products: this.productService.getProductsByStoreId(storeId, { pageNumber: 0, pageSize: 100 }).pipe(catchError(() => of(null))),
      analytics: this.analyticsService.getCustomerAnalytics(storeId).pipe(catchError(() => of(null)))
    }).subscribe(({ orders, products, analytics }) => {
      this.rawOrders = orders?.content || [];
      this.rawProducts = products?.content || [];
      this.customerAnalytics = analytics;
      
      // Default to last 30 days if no date selected
      if (!this.startDate && !this.endDate) {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          this.startDate = d.toISOString().split('T')[0];
          this.endDate = new Date().toISOString().split('T')[0];
      }

      this.applyDateFilter();
      this.isLoading = false;
    });
  }

  applyDateFilter(): void {
      let filteredOrders = [...this.rawOrders];
      
      if (this.startDate) {
          const start = new Date(this.startDate).getTime();
          filteredOrders = filteredOrders.filter(o => new Date(o.orderDate).getTime() >= start);
      }
      if (this.endDate) {
          const end = new Date(this.endDate);
          end.setHours(23, 59, 59, 999);
          filteredOrders = filteredOrders.filter(o => new Date(o.orderDate).getTime() <= end.getTime());
      }

      this.totalProducts = this.rawProducts.length;
      this.lowStockCount = this.rawProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10).length;

      const nonCancelled = filteredOrders.filter(o => o.status !== OrderStatus.CANCELLED);
      this.totalOrders = filteredOrders.length;
      this.totalRevenue = nonCancelled.reduce((s, o) => s + o.grandTotal, 0);
      this.avgOrderValue = nonCancelled.length > 0 ? this.totalRevenue / nonCancelled.length : 0;

      this.computeMonthlyRevenue(nonCancelled);
      this.computeTopProducts(filteredOrders, this.rawProducts);
      this.computeStatusDist(filteredOrders);
      
      this.selectedMonth = null;
      this.selectedMonthOrders = [];

      if (this.viewReady) setTimeout(() => this.renderCharts(), 50);
  }

  onMonthClick(month: string): void {
      this.selectedMonth = month;
      this.selectedMonthOrders = this.rawOrders.filter(o => {
          const d = new Date(o.orderDate);
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return m === month && o.status !== OrderStatus.CANCELLED;
      }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }

  computeMonthlyRevenue(orders: DtoOrder[]): void {
    const map = new Map<string, { revenue: number; count: number }>();
    orders.forEach(o => {
      const d = new Date(o.orderDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const e = map.get(key) || { revenue: 0, count: 0 };
      e.revenue += o.grandTotal;
      e.count++;
      map.set(key, e);
    });
    this.monthlyRevenue = Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }

  computeTopProducts(orders: DtoOrder[], products: Product[]): void {
    const soldMap = new Map<number, { sold: number; revenue: number }>();
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const e = soldMap.get(item.productId) || { sold: 0, revenue: 0 };
        e.sold += item.quantity;
        e.revenue += item.price * item.quantity;
        soldMap.set(item.productId, e);
      });
    });
    const productMap = new Map(products.map(p => [p.id, p.name]));
    this.topProducts = Array.from(soldMap.entries())
      .map(([pid, data]) => ({ name: productMap.get(pid) || `Product #${pid}`, ...data }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }

  computeStatusDist(orders: DtoOrder[]): void {
    const map = new Map<string, number>();
    orders.forEach(o => map.set(o.status, (map.get(o.status) || 0) + 1));
    const colorMap: Record<string, string> = {
      PENDING: '#eab308', PAID: '#3b82f6', PARTIALLY_SHIPPED: '#8b5cf6',
      SHIPPED: '#a855f7', DELIVERED: '#22c55e', CANCELLED: '#ef4444'
    };
    this.statusDist = Array.from(map.entries()).map(([status, count]) => ({
      status, count, color: colorMap[status] || '#94a3b8'
    }));
  }

  renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Monthly revenue
    if (this.revenueChartRef && this.monthlyRevenue.length > 0) {
      this.charts.push(new Chart(this.revenueChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: this.monthlyRevenue.map(d => d.month),
          datasets: [{
            label: 'Revenue (₺)',
            data: this.monthlyRevenue.map(d => d.revenue),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.1)',
            fill: true, tension: 0.4,
            pointBackgroundColor: '#f59e0b', pointRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, callback: (v) => '₺' + v } }
          },
          onClick: (e, elements) => {
              if (elements && elements.length > 0) {
                  const idx = elements[0].index;
                  const month = this.monthlyRevenue[idx].month;
                  this.onMonthClick(month);
              }
          }
        }
      }));
    }

    // Top products
    if (this.topProductsRef && this.topProducts.length > 0) {
      this.charts.push(new Chart(this.topProductsRef.nativeElement, {
        type: 'bar',
        data: {
          labels: this.topProducts.map(d => d.name),
          datasets: [{
            label: 'Units Sold',
            data: this.topProducts.map(d => d.sold),
            backgroundColor: 'rgba(245,158,11,0.7)',
            borderRadius: 6, borderSkipped: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { display: false }, ticks: { color: textColor } }
          }
        }
      }));
    }

    // Status distribution
    if (this.orderStatusRef && this.statusDist.length > 0) {
      this.charts.push(new Chart(this.orderStatusRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.statusDist.map(d => d.status),
          datasets: [{
            data: this.statusDist.map(d => d.count),
            backgroundColor: this.statusDist.map(d => d.color),
            borderWidth: 0, hoverOffset: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 12, usePointStyle: true } } }
        }
      }));
    }

    // Customer segments
    if (this.customerSegmentsRef && this.customerAnalytics && this.customerAnalytics.segments && this.customerAnalytics.segments.length > 0) {
      this.charts.push(new Chart(this.customerSegmentsRef.nativeElement, {
        type: 'pie',
        data: {
          labels: this.customerAnalytics.segments.map(s => s.name),
          datasets: [{
            data: this.customerAnalytics.segments.map(s => s.count),
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
            borderWidth: 0, hoverOffset: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { color: textColor, padding: 12, usePointStyle: true } } }
        }
      }));
    }
  }
}
