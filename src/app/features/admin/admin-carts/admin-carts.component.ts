import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { DtoCart } from '../../../shared/models/cart';

@Component({
  selector: 'app-admin-carts',
  imports: [CommonModule],
  templateUrl: './admin-carts.component.html',
  styleUrl: './admin-carts.component.css'
})
export class AdminCartsComponent implements OnInit {
  cartService = inject(CartService);

  carts: DtoCart[] = [];
  isLoading = true;
  errorMessage = '';

  // Pagination
  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;

  ngOnInit(): void {
    this.fetchCarts();
  }

  fetchCarts(): void {
    this.isLoading = true;
    this.cartService.findAllCarts({ pageNumber: this.pageNumber, pageSize: this.pageSize }).subscribe({
      next: (res) => {
        if (res.payload) {
          this.carts = res.payload.content || [];
          this.totalPages = Math.ceil((res.payload.totalElement || 0) / this.pageSize);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to load carts.';
        this.isLoading = false;
      }
    });
  }

  prevPage(): void { if (this.pageNumber > 0) { this.pageNumber--; this.fetchCarts(); } }
  nextPage(): void { if (this.pageNumber < this.totalPages - 1) { this.pageNumber++; this.fetchCarts(); } }

  deleteCart(cartId: number): void {
    if (confirm(`Are you sure you want to delete cart ID: ${cartId}?`)) {
      this.cartService.adminDeleteCart(cartId).subscribe({
        next: () => {
          this.carts = this.carts.filter(c => c.id !== cartId);
        },
        error: (err) => {
          console.error(err);
          alert('Failed to delete cart.');
        }
      });
    }
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.fetchCarts();
    }
  }
}
