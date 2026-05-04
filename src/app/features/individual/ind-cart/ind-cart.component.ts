import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { PaymentService } from '../../../core/services/payment.service';
import { AddressService } from '../../../core/services/address.service';
import { DtoAddress } from '../../../shared/models/address';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';

declare var Stripe: any;

@Component({
  selector: 'app-ind-cart',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ind-cart.component.html',
  styleUrl: './ind-cart.component.css'
})
export class IndCartComponent implements OnInit {
  cartService = inject(CartService);
  toastService = inject(ToastService);
  orderService = inject(OrderService);
  paymentService = inject(PaymentService);
  private addressService = inject(AddressService);

  showClearModal = false;
  showCheckoutModal = false;

  // Address selection state
  addresses: DtoAddress[] = [];
  selectedAddressId: number | null = null;
  isLoadingAddresses = false;

  isProcessing = false;

  ngOnInit(): void {
    this.cartService.refreshMyCart().subscribe();
  }

  updateQuantity(itemId: number, newQuantity: number) {
    if (newQuantity < 1) return;
    this.cartService.updateQuantity(itemId, newQuantity).subscribe();
  }

  removeItem(itemId: number) {
    this.cartService.removeItem(itemId).subscribe();
  }

  confirmClearCart() {
    this.showClearModal = true;
  }

  cancelClearCart() {
    this.showClearModal = false;
  }

  executeClearCart() {
    this.cartService.clearCart().subscribe({
      next: () => {
        this.showClearModal = false;
        this.toastService.showInfo('Cart cleared successfully.');
      }
    });
  }

  openCheckoutModal() {
    this.showCheckoutModal = true;
    this.loadAddresses();
  }

  loadAddresses() {
    this.isLoadingAddresses = true;
    this.addressService.findMyAddresses({ pageNumber: 0, pageSize: 100 }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load addresses.');
        this.isLoadingAddresses = false;
        return of(null);
      })
    ).subscribe(res => {
      this.addresses = res?.content || [];
      // Auto-select the first address if available
      if (this.addresses.length > 0) {
        this.selectedAddressId = this.addresses[0].id!;
      }
      this.isLoadingAddresses = false;
    });
  }

  cancelCheckout() {
    this.showCheckoutModal = false;
    this.selectedAddressId = null;
  }

  proceedToPayment() {
    if (this.addresses.length === 0) {
      this.toastService.showError('You must add an address before proceeding.');
      return;
    }

    if (!this.selectedAddressId) {
      this.toastService.showError('Please select a shipping address.');
      return;
    }

    const selectedAddr = this.addresses.find(a => a.id === this.selectedAddressId);
    if (!selectedAddr) return;

    this.isProcessing = true;

    // 1. Create the order
    this.orderService.create({
      addressId: this.selectedAddressId
    }).pipe(
      catchError(err => {
        this.toastService.showError('Failed to create order. ' + (err.error?.exception?.message || ''));
        this.isProcessing = false;
        return of(null);
      })
    ).subscribe(createdOrder => {
      if (createdOrder && createdOrder.id) {
        // 2. Initiate Payment
        this.paymentService.create({
          orderId: createdOrder.id
        }).pipe(
          catchError(err => {
            this.toastService.showError('Failed to initiate payment. ' + (err.error?.exception?.message || ''));
            this.isProcessing = false;
            return of(null);
          })
        ).subscribe(payment => {
          if (payment && payment.transactionKey) {
            this.toastService.showSuccess('Redirecting to payment gateway...');
            const stripe = Stripe(environment.stripePublicKey);
            stripe.redirectToCheckout({ sessionId: payment.transactionKey }).then((result: any) => {
              if (result.error) {
                this.toastService.showError(result.error.message);
                this.isProcessing = false;
              }
            });
          } else {
            this.isProcessing = false;
          }
        });
      }
    });
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url) return 'assets/placeholder-image.webp';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('assets/')) return url;
    return `assets/images/${url}`;
  }
}
