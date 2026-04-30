import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { ShipmentService } from '../../../core/services/shipment.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoOrder, OrderStatus } from '../../../shared/models/order';
import { DtoShipment, ShipmentStatus } from '../../../shared/models/shipment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-admin-orders',
  imports: [CommonModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.css'
})
export class AdminOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private shipmentService = inject(ShipmentService);
  private toastService = inject(ToastService);

  orders: DtoOrder[] = [];
  isLoading = true;
  expandedOrderId: number | null = null;
  
  shipmentsMap: Record<number, DtoShipment | null> = {};
  ShipmentStatus = ShipmentStatus;
  isUpdatingShipment = false;

  // Pagination
  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;

  ngOnInit(): void {
    this.loadAllOrders();
  }

  loadAllOrders(): void {
    this.isLoading = true;
    this.orderService.getAllOrders({ pageNumber: this.pageNumber, pageSize: this.pageSize }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load global orders.');
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(res => {
      const allOrders = res?.content || [];
      const subOrderIds = new Set<number>();
      allOrders.forEach(o => {
        if (o.subOrders && o.subOrders.length > 0) {
          o.subOrders.forEach(sub => subOrderIds.add(sub.id!));
        }
      });
      
      this.orders = allOrders.filter(o => !subOrderIds.has(o.id!));
      this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
      this.isLoading = false;
    });
  }

  prevPage(): void { if (this.pageNumber > 0) { this.pageNumber--; this.loadAllOrders(); } }
  nextPage(): void { if (this.pageNumber < this.totalPages - 1) { this.pageNumber++; this.loadAllOrders(); } }

  toggleExpand(orderId: number | undefined): void {
    if (!orderId) return;
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
    if (this.expandedOrderId) {
      const parentOrder = this.orders.find(o => o.id === orderId);
      if (parentOrder && parentOrder.subOrders) {
        parentOrder.subOrders.forEach(sub => {
          if (sub.id && !(sub.id in this.shipmentsMap)) {
            this.loadShipmentForOrder(sub.id);
          }
        });
      }
    }
  }

  loadShipmentForOrder(orderId: number): void {
    this.shipmentsMap[orderId] = null;
    this.shipmentService.getByOrderId(orderId).pipe(
      catchError(() => of(null))
    ).subscribe(shipment => {
      this.shipmentsMap[orderId] = shipment;
    });
  }

  updateShipmentStatus(orderId: number, shipmentId: number, newStatus: ShipmentStatus): void {
    this.isUpdatingShipment = true;
    this.shipmentService.updateStatus(shipmentId, newStatus).pipe(
      catchError(err => {
        this.toastService.showError('Failed to update shipment status.');
        this.isUpdatingShipment = false;
        return of(null);
      })
    ).subscribe(updatedShipment => {
      if (updatedShipment) {
        this.toastService.showSuccess('Shipment updated to ' + newStatus);
        this.shipmentsMap[orderId] = updatedShipment;
        
        // Also reload orders if the order status might have cascaded
        if (newStatus === ShipmentStatus.DELIVERED || newStatus === ShipmentStatus.CANCELLED) {
            this.loadAllOrders();
        }
      }
      this.isUpdatingShipment = false;
    });
  }

  cancelShipment(orderId: number, shipmentId: number): void {
    this.isUpdatingShipment = true;
    this.shipmentService.cancel(shipmentId).pipe(
      catchError(err => {
        this.toastService.showError('Failed to cancel shipment.');
        this.isUpdatingShipment = false;
        return of(null);
      })
    ).subscribe(updatedShipment => {
      if (updatedShipment) {
        this.toastService.showSuccess('Shipment cancelled successfully.');
        this.shipmentsMap[orderId] = updatedShipment;
        this.loadAllOrders();
      }
      this.isUpdatingShipment = false;
    });
  }

  getStatusClass(status: OrderStatus | ShipmentStatus): string {
    switch (status) {
      case OrderStatus.PENDING:   return 'status-pending';
      case OrderStatus.PAID:  return 'status-approved';
      case OrderStatus.PARTIALLY_SHIPPED:   return 'status-shipped';
      case OrderStatus.SHIPPED:   return 'status-shipped';
      case OrderStatus.DELIVERED: return 'status-delivered';
      case OrderStatus.CANCELLED: return 'status-cancelled';
      case ShipmentStatus.LABEL_CREATED: return 'status-approved';
      case ShipmentStatus.IN_TRANSIT: return 'status-shipped';
      case ShipmentStatus.OUT_FOR_DELIVERY: return 'status-shipped';
      case ShipmentStatus.RETURNED: return 'status-cancelled';
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
      this.loadAllOrders();
    }
  }
}
