import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { Store } from '../../../shared/models/store';
import { Product, ProductRequest } from '../../../shared/models/product';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-corp-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './corp-inventory.component.html',
  styleUrl: './corp-inventory.component.css'
})
export class CorpInventoryComponent implements OnInit {
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private toastService = inject(ToastService);

  selectedStoreId: number | null = null;
  isLoading = false;
  products: Product[] = [];
  filteredProducts: Product[] = [];

  // Filters
  stockFilter: string = 'ALL'; // ALL, LOW, OUT
  searchTerm = '';

  // Inline edit
  editingProductId: number | null = null;
  editStockValue: number = 0;
  isSaving = false;

  // Stats
  totalProducts = 0;
  lowStockCount = 0;
  outOfStockCount = 0;

  ngOnInit(): void {
    this.loadStore();
  }

  loadStore(): void {
    this.storeService.getMyStores({ pageNumber: 0, pageSize: 10 }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load store.');
        return of(null);
      })
    ).subscribe(res => {
      const stores = res?.content || [];
      if (stores.length > 0) {
        this.selectedStoreId = stores[0].id;
        this.loadProducts(this.selectedStoreId);
      }
    });
  }

  loadProducts(storeId: number): void {
    this.isLoading = true;
    this.editingProductId = null;
    this.productService.getProductsByStoreId(storeId, { pageNumber: 0, pageSize: 100 }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load inventory.');
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(res => {
      this.products = res?.content || [];
      this.computeStats();
      this.applyFilters();
      this.isLoading = false;
    });
  }

  computeStats(): void {
    this.totalProducts = this.products.length;
    this.lowStockCount = this.products.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10).length;
    this.outOfStockCount = this.products.filter(p => p.stockQuantity === 0).length;
  }

  applyFilters(): void {
    let result = [...this.products];

    if (this.stockFilter === 'LOW') {
      result = result.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10);
    } else if (this.stockFilter === 'OUT') {
      result = result.filter(p => p.stockQuantity === 0);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      );
    }

    this.filteredProducts = result;
  }

  startEdit(product: Product): void {
    this.editingProductId = product.id;
    this.editStockValue = product.stockQuantity;
  }

  cancelEdit(): void {
    this.editingProductId = null;
  }

  saveStock(product: Product): void {
    if (this.editStockValue < 0) {
      this.toastService.showError('Stock cannot be negative.');
      return;
    }

    this.isSaving = true;
    const request: ProductRequest = {
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      sku: product.sku,
      unitPrice: product.unitPrice,
      stockQuantity: this.editStockValue,
      categoryId: null, // Keep existing
      storeId: product.storeId
    };

    this.productService.updateProduct(product.id, request).pipe(
      catchError(err => {
        this.toastService.showError('Failed to update stock. ' + (err.error?.exception?.message || ''));
        this.isSaving = false;
        return of(null);
      })
    ).subscribe(updated => {
      if (updated) {
        const idx = this.products.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          this.products[idx] = updated;
        }
        this.computeStats();
        this.applyFilters();
        this.toastService.showSuccess(`Stock updated for "${product.name}".`);
        this.editingProductId = null;
      }
      this.isSaving = false;
    });
  }

  getStockClass(qty: number): string {
    if (qty === 0) return 'stock-out';
    if (qty <= 5) return 'stock-critical';
    if (qty < 10) return 'stock-low';
    return 'stock-ok';
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url) return 'assets/placeholder-product.png';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('assets/images/')) return url;
    return `assets/images/${url}`;
  }
}
