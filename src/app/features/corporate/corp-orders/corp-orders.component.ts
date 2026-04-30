import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { StoreService } from '../../../core/services/store.service';
import { ShipmentService } from '../../../core/services/shipment.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoOrder, OrderStatus } from '../../../shared/models/order';
import { Store } from '../../../shared/models/store';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-corp-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './corp-orders.component.html',
  styleUrl: './corp-orders.component.css'
})
export class CorpOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private storeService = inject(StoreService);
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  OrderStatus = OrderStatus;

  selectedStoreId: number | null = null;
  orders: DtoOrder[] = [];
  isLoading = false;
  expandedOrderId: number | null = null;

  // Pagination
  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;

  // Shipment Modal State
  showShipmentModal = false;
  isInitializingShipment = false;
  selectedOrderForShipment: DtoOrder | null = null;
  shipmentFormData = {
    warehouse: '',
    mode: 'Standard'
  };

  ngOnInit(): void {
    this.storeService.getMyStores({ pageNumber: 0, pageSize: 10 }).subscribe({
      next: (res) => {
        const stores = res?.content || [];
        if (stores.length > 0 && stores[0].id) {
          this.selectedStoreId = stores[0].id;
          this.loadOrders();
        }
      }
    });
  }

  loadOrders(): void {
    if (!this.selectedStoreId) return;
    this.isLoading = true;
    this.orderService.getStoreOrders(this.selectedStoreId, { pageNumber: this.pageNumber, pageSize: this.pageSize }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load store orders.');
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(res => {
      this.orders = res?.content || [];
      this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
      this.isLoading = false;
    });
  }

  prevPage(): void { if (this.pageNumber > 0) { this.pageNumber--; this.loadOrders(); } }
  nextPage(): void { if (this.pageNumber < this.totalPages - 1) { this.pageNumber++; this.loadOrders(); } }

  toggleExpand(orderId: number | undefined): void {
    if (!orderId) return;
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  openShipmentModal(order: DtoOrder, event: Event): void {
    event.stopPropagation();
    this.selectedOrderForShipment = order;
    this.shipmentFormData = { warehouse: '', mode: 'Standard' };
    this.showShipmentModal = true;
  }

  closeShipmentModal(): void {
    this.showShipmentModal = false;
    this.selectedOrderForShipment = null;
  }

  submitShipment(): void {
    if (!this.selectedOrderForShipment?.id) return;
    
    this.isInitializingShipment = true;
    const request = {
      childOrderId: this.selectedOrderForShipment.id,
      warehouse: this.shipmentFormData.warehouse,
      mode: this.shipmentFormData.mode
    };

    this.shipmentService.initialize(request).pipe(
      catchError(err => {
        this.toastService.showError('Failed to initialize shipment. ' + (err.error?.exception?.message || ''));
        this.isInitializingShipment = false;
        return of(null);
      })
    ).subscribe(shipment => {
      if (shipment) {
        this.toastService.showSuccess('Shipment initialized successfully.');
        this.closeShipmentModal();
        this.loadOrders();
      }
      this.isInitializingShipment = false;
    });
  }

  updateStatus(order: DtoOrder, newStatus: OrderStatus): void {
    if (!order.id || !this.selectedStoreId) return;
    this.orderService.updateSubOrderStatus(order.id, newStatus, this.selectedStoreId).pipe(
      catchError(err => {
        this.toastService.showError('Failed to update status. ' + (err.error?.exception?.message || ''));
        return of(null);
      })
    ).subscribe(updated => {
      if (updated) {
        this.toastService.showSuccess(`Order status updated to ${newStatus}.`);
        this.loadOrders();
      }
    });
  }

  getStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:   return 'status-pending';
      case OrderStatus.PAID:  return 'status-approved';
      case OrderStatus.PARTIALLY_SHIPPED:   return 'status-shipped';
      case OrderStatus.SHIPPED:   return 'status-shipped';
      case OrderStatus.DELIVERED: return 'status-delivered';
      case OrderStatus.CANCELLED: return 'status-cancelled';
      default: return '';
    }
  }

  getStatusIcon(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:   return '⏳';
      case OrderStatus.PAID:  return '✅';
      case OrderStatus.PARTIALLY_SHIPPED:   return '📦';
      case OrderStatus.SHIPPED:   return '🚚';
      case OrderStatus.DELIVERED: return '🎉';
      case OrderStatus.CANCELLED: return '❌';
      default: return '•';
    }
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.loadOrders();
    }
  }
}
