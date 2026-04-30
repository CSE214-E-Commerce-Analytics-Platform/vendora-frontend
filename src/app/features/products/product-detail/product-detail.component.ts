import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product } from '../../../shared/models/product';
import { ReviewWidgetComponent } from '../../../shared/components/review-widget/review-widget.component';

@Component({
    selector: 'app-product-detail',
    standalone: true,
    imports: [CommonModule, ReviewWidgetComponent],
    templateUrl: './product-detail.component.html',
    styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private productService = inject(ProductService);
    private cartService = inject(CartService);
    private toastService = inject(ToastService);

    product: Product | null = null;
    isLoading = true;
    errorMessage = '';
    quantity = 1;

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (id) {
            this.productService.getProductById(id).subscribe({
                next: (data) => {
                    this.product = data;
                    this.isLoading = false;
                },
                error: (err) => {
                    this.errorMessage = 'Product not found or failed to load.';
                    this.isLoading = false;
                }
            });
        }
    }

    incrementQty(): void {
        this.quantity++;
    }

    decrementQty(): void {
        if (this.quantity > 1) this.quantity--;
    }

    addToCart(productId: number | undefined) {
        if (!productId) return;
        this.cartService.addItemToCart({ productId, quantity: this.quantity }).subscribe({
            next: () => {
                this.toastService.showSuccess(`🛒 ${this.quantity}x ${this.product?.name} added to cart!`);
            }
        });
    }

    getImageUrl(url: string | null | undefined): string {
        if (!url) return 'assets/placeholder-product.png';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('assets/images/')) return url;
        return `assets/images/${url}`;
    }

    goBack(): void {
        this.location.back();
    }
}
