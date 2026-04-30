import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../shared/models/product';

import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-ind-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ind-products.component.html',
  styleUrl: './ind-products.component.css'
})
export class IndProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private toastService = inject(ToastService);

  products: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = true;
  errorMessage = '';

  // Pagination
  pageNumber = 0;
  pageSize = 24;
  totalPages = 0;

  // Filter & Sort State
  searchTerm = '';
  selectedCategory = 'ALL';
  sortOption = 'DEFAULT';
  categories: string[] = [];

  ngOnInit(): void {
    this.fetchProducts();
  }

  fetchProducts(): void {
    this.isLoading = true;
    this.productService.getProducts({ pageNumber: this.pageNumber, pageSize: this.pageSize }).subscribe({
      next: (res) => {
        const raw = res?.content || [];
        for (let i = raw.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [raw[i], raw[j]] = [raw[j], raw[i]];
        }
        this.products = raw;
        this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
        this.extractCategories();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching products', err);
        this.errorMessage = 'Failed to load products. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  prevPage(): void {
    if (this.pageNumber > 0) {
      this.pageNumber--;
      this.fetchProducts();
    }
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages - 1) {
      this.pageNumber++;
      this.fetchProducts();
    }
  }

  extractCategories(): void {
    const cats = new Set(this.products.map(p => p.categoryName).filter(c => !!c));
    this.categories = Array.from(cats) as string[];
  }

  applyFilters(): void {
    let result = [...this.products];

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term))
      );
    }

    // Category
    if (this.selectedCategory !== 'ALL') {
      result = result.filter(p => p.categoryName === this.selectedCategory);
    }

    // Sort
    switch (this.sortOption) {
      case 'PRICE_ASC':
        result.sort((a, b) => a.unitPrice - b.unitPrice);
        break;
      case 'PRICE_DESC':
        result.sort((a, b) => b.unitPrice - a.unitPrice);
        break;
      case 'NAME_ASC':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'NAME_DESC':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    this.filteredProducts = result;
  }

  addToCart(product: Product): void {
    if (!product.id) return;
    this.cartService.addItemToCart({ productId: product.id, quantity: 1 }).subscribe({
        next: () => {
            this.toastService.showSuccess(`🛒 ${product.name} added to cart!`);
        }
    });
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url) return 'assets/placeholder-product.png';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('assets/images/')) return url;
    return `assets/images/${url}`;
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.fetchProducts();
    }
  }
}
