import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../shared/models/product';

@Component({
    selector: 'app-product-list',
    imports: [CommonModule],
    templateUrl: './product-list.component.html',
    styleUrl: './product-list.component.css'
})
export class ProductListComponent implements OnInit {
    private productService = inject(ProductService);
    private authService = inject(AuthService);
    private router = inject(Router);

    products: Product[] = [];
    filteredProducts: Product[] = [];
    categories: string[] = [];
    selectedCategory = 'All';
    isLoading = true;
    errorMessage = '';

    ngOnInit(): void {
        this.loadProducts();
    }

    loadProducts(): void {
        this.productService.getProducts().subscribe({
            next: (res) => this.handleProductsLoaded(res.content ?? []),
            error: () => {
                this.errorMessage = 'Failed to load products. Please try again.';
                this.isLoading = false;
            }
        });
    }

    private handleProductsLoaded(data: Product[]): void {
        this.products = data;
        this.filteredProducts = data;
        this.categories = ['All', ...new Set(data.map(p => p.categoryName).filter(Boolean))];
        this.isLoading = false;
    }

    filterByCategory(category: string): void {
        this.selectedCategory = category;
        if (category === 'All') {
            this.filteredProducts = this.products;
        } else {
            this.filteredProducts = this.products.filter(p => p.categoryName === category);
        }
    }

    viewProduct(id: number): void {
        this.router.navigate(['/products', id]);
    }
}
