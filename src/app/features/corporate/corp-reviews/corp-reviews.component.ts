import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoReview } from '../../../shared/models/review';
import { Store } from '../../../shared/models/store';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-corp-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './corp-reviews.component.html',
  styleUrl: './corp-reviews.component.css'
})
export class CorpReviewsComponent implements OnInit {
  private storeService = inject(StoreService);
  private reviewService = inject(ReviewService);
  private toastService = inject(ToastService);

  selectedStoreId: number | null = null;
  reviews: DtoReview[] = [];
  isLoading = false;

  // Pagination
  pageNumber = 0;
  pageSize = 20;
  totalPages = 0;

  ngOnInit(): void {
    this.storeService.getMyStores({ pageNumber: 0, pageSize: 10 }).subscribe({
      next: (res) => {
        const stores = res?.content || [];
        if (stores.length > 0 && stores[0].id) {
          this.selectedStoreId = stores[0].id;
          this.loadReviews();
        }
      }
    });
  }

  loadReviews(): void {
    if (!this.selectedStoreId) return;
    this.isLoading = true;
    this.reviewService.getCorporateReviews(this.selectedStoreId, { pageNumber: this.pageNumber, pageSize: this.pageSize }).pipe(
      catchError(err => {
        this.toastService.showError('Failed to load store reviews. ' + (err.error?.exception?.message || ''));
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(res => {
      this.reviews = res?.content || [];
      this.totalPages = Math.ceil((res?.totalElement || 0) / this.pageSize);
      this.isLoading = false;
    });
  }

  prevPage(): void { if (this.pageNumber > 0) { this.pageNumber--; this.loadReviews(); } }
  nextPage(): void { if (this.pageNumber < this.totalPages - 1) { this.pageNumber++; this.loadReviews(); } }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((x, i) => i + 1);
  }

  goToPage(pageStr: string): void {
    const page = parseInt(pageStr, 10);
    if (!isNaN(page) && page > 0 && page <= this.totalPages) {
      this.pageNumber = page - 1;
      this.loadReviews();
    }
  }
}
