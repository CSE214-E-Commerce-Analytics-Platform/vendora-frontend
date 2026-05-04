import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../shared/models/api-response';
import { DtoReview, DtoReviewRequest } from '../../shared/models/review';
import { environment } from '../../../environments/environment';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/reviews`;

  create(request: DtoReviewRequest): Observable<DtoReview> {
    return this.http.post<ApiResponse<DtoReview>>(this.apiUrl, request)
      .pipe(map(res => res.payload as DtoReview));
  }

  getByProductId(productId: number, request?: RestPageableRequest): Observable<RestPageableEntity<DtoReview>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoReview>>>(`${this.apiUrl}/product/${productId}`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoReview>));
  }

  getAll(request?: RestPageableRequest): Observable<RestPageableEntity<DtoReview>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoReview>>>(this.apiUrl, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoReview>));
  }

  getById(id: number): Observable<DtoReview> {
    return this.http.get<ApiResponse<DtoReview>>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.payload as DtoReview));
  }

  getByUserId(userId: number, request?: RestPageableRequest): Observable<RestPageableEntity<DtoReview>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoReview>>>(`${this.apiUrl}/${userId}/reviews`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoReview>));
  }

  getMyReviews(request?: RestPageableRequest): Observable<RestPageableEntity<DtoReview>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoReview>>>(`${this.apiUrl}/my-reviews`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoReview>));
  }

  getCorporateReviews(storeId: number, request?: RestPageableRequest): Observable<RestPageableEntity<DtoReview>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoReview>>>(`${this.apiUrl}/corporate/${storeId}/my-reviews`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoReview>));
  }

  update(reviewId: number, request: DtoReviewRequest): Observable<DtoReview> {
    return this.http.put<ApiResponse<DtoReview>>(`${this.apiUrl}/${reviewId}`, request)
      .pipe(map(res => res.payload as DtoReview));
  }

  deleteMyReview(reviewId: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/my-reviews/${reviewId}`)
      .pipe(map(res => res.payload as void));
  }

  deleteReview(reviewId: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${reviewId}`)
      .pipe(map(res => res.payload as void));
  }
}
