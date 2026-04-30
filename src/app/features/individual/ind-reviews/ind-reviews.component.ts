import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../core/services/review.service';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoReview, DtoReviewRequest, Sentiment } from '../../../shared/models/review';
import { Product } from '../../../shared/models/product';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-ind-reviews',
  imports: [CommonModule, FormsModule],
  templateUrl: './ind-reviews.component.html',
  styleUrl: './ind-reviews.component.css'
})
export class IndReviewsComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private productService = inject(ProductService);
  private toastService = inject(ToastService);

  Sentiment = Sentiment;

  reviews: DtoReview[] = [];
  productsMap: Record<number, Product> = {};
  isLoading = true;
  editingReviewId: number | null = null;
  editForm: DtoReviewRequest = { productId: 0, starRating: 0 };
  deletingId: number | null = null;
  savingId: number | null = null;

  // Pagination
  pageNumber = 0;
  pageSize = 10;
  totalPages = 0;

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.reviewService.getMyReviews({ pageNumber: this.pageNumber, pageSize: this.pageSize }).pipe(
      catchError(() => {
        this.toastService.showError('Failed to load reviews.');
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(res => {
      this.reviews = res?.content || [];
      this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
      const uniqueProductIds = [...new Set(this.reviews.map(r => r.productId))];
      uniqueProductIds.forEach(pid => {
        if (!this.productsMap[pid]) {
          this.productService.getProductById(pid).subscribe(prod => {
            this.productsMap[pid] = prod;
          });
        }
      });
      this.isLoading = false;
    });
  }

  prevPage(): void {
    if (this.pageNumber > 0) {
      this.pageNumber--;
      this.loadReviews();
    }
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages - 1) {
      this.pageNumber++;
      this.loadReviews();
    }
  }

  startEdit(review: DtoReview): void {
    this.editingReviewId = review.id!;
    this.editForm = { productId: review.productId, starRating: review.starRating, commentText: review.commentText };
  }

  cancelEdit(): void {
    this.editingReviewId = null;
  }

  saveEdit(reviewId: number): void {
    this.savingId = reviewId;
    this.reviewService.update(reviewId, this.editForm).pipe(
      catchError(err => {
        this.toastService.showError('Failed to update review. ' + (err.error?.exception?.message || ''));
        this.savingId = null;
        return of(null);
      })
    ).subscribe(updated => {
      if (updated) {
        this.toastService.showSuccess('Review updated.');
        this.editingReviewId = null;
        this.loadReviews();
      }
      this.savingId = null;
    });
  }

  deleteReview(reviewId: number): void {
    this.deletingId = reviewId;
    this.reviewService.deleteMyReview(reviewId).pipe(
      catchError(err => {
        this.toastService.showError('Failed to delete review. ' + (err.error?.exception?.message || ''));
        this.deletingId = null;
        return of(null);
      })
    ).subscribe(() => {
      this.toastService.showSuccess('Review deleted.');
      this.reviews = this.reviews.filter(r => r.id !== reviewId);
      this.deletingId = null;
    });
  }

  setEditStar(star: number): void {
    this.editForm.starRating = star;
  }

  getStars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  getSentimentClass(sentiment: Sentiment | undefined): string {
    switch (sentiment) {
      case Sentiment.POSITIVE: return 'sentiment-positive';
      case Sentiment.NEUTRAL:  return 'sentiment-neutral';
      case Sentiment.NEGATIVE: return 'sentiment-negative';
      default: return '';
    }
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
      this.loadReviews();
    }
  }
}
