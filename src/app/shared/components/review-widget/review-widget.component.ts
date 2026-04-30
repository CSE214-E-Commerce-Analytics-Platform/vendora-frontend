import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../core/services/toast.service';
import { DtoReview, DtoReviewRequest } from '../../models/review';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-review-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-widget.component.html',
  styleUrl: './review-widget.component.css'
})
export class ReviewWidgetComponent implements OnInit {
  @Input() productId!: number;
  @Input() allowWrite = false; // If true, shows the writing form

  private reviewService = inject(ReviewService);
  private toastService = inject(ToastService);

  reviews: DtoReview[] = [];
  isLoading = true;

  // Form State
  newReview: DtoReviewRequest = {
    productId: 0,
    starRating: 5,
    commentText: ''
  };
  isSubmitting = false;
  hasSubmitted = false;

  ngOnInit(): void {
    if (this.productId) {
      this.newReview.productId = this.productId;
      this.loadReviews();
    }
  }

  loadReviews(): void {
    this.isLoading = true;
    this.reviewService.getByProductId(this.productId).pipe(
      catchError(() => {
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(data => {
      this.reviews = data?.content || [];
      this.isLoading = false;
    });
  }

  setRating(rating: number): void {
    this.newReview.starRating = rating;
  }

  submitReview(): void {
    if (!this.newReview.commentText?.trim()) {
      this.toastService.showError('Please write a comment.');
      return;
    }
    
    this.isSubmitting = true;
    this.reviewService.create(this.newReview).pipe(
      catchError(err => {
        this.toastService.showError('Could not submit review: ' + (err.error?.exception?.message || 'Error'));
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe(res => {
      if (res) {
        this.toastService.showSuccess('Review submitted successfully!');
        this.reviews.unshift(res);
        this.hasSubmitted = true;
        this.allowWrite = false; // Hide form after submission
      }
      this.isSubmitting = false;
    });
  }
}
