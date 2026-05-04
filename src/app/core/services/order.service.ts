import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../shared/models/api-response';
import { DtoOrder, DtoOrderRequest, OrderStatus } from '../../shared/models/order';
import { environment } from '../../../environments/environment';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/orders`;

  create(request: DtoOrderRequest): Observable<DtoOrder> {
    return this.http.post<ApiResponse<DtoOrder>>(`${this.apiUrl}/create`, request)
      .pipe(map(res => res.payload as DtoOrder));
  }

  getMyOrders(request?: RestPageableRequest): Observable<RestPageableEntity<DtoOrder>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoOrder>>>(`${this.apiUrl}/my-orders`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoOrder>));
  }

  cancel(orderId: number): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${orderId}/cancel`, {})
      .pipe(map(res => res.payload as void));
  }

  getStoreOrders(storeId: number, request?: RestPageableRequest): Observable<RestPageableEntity<DtoOrder>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoOrder>>>(`${this.apiUrl}/store/${storeId}`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoOrder>));
  }

  updateSubOrderStatus(subOrderId: number, status: OrderStatus, storeId: number): Observable<DtoOrder> {
    return this.http.patch<ApiResponse<DtoOrder>>(`${this.apiUrl}/sub-order/${subOrderId}/status?status=${status}&storeId=${storeId}`, {})
      .pipe(map(res => res.payload as DtoOrder));
  }

  getAllOrders(request?: RestPageableRequest): Observable<RestPageableEntity<DtoOrder>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoOrder>>>(`${this.apiUrl}/admin/all`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoOrder>));
  }

  getById(orderId: number): Observable<DtoOrder> {
    return this.http.get<ApiResponse<DtoOrder>>(`${this.apiUrl}/${orderId}`)
      .pipe(map(res => res.payload as DtoOrder));
  }
}
