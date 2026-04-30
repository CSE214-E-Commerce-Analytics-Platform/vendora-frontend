import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../shared/models/api-response';
import { DtoPayment, DtoPaymentRequest, PaymentStatus } from '../../shared/models/payment';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/payments`;

  create(request: DtoPaymentRequest): Observable<DtoPayment> {
    return this.http.post<ApiResponse<DtoPayment>>(`${this.apiUrl}/create`, request)
      .pipe(map(res => res.payload as DtoPayment));
  }

  getByOrderId(orderId: number): Observable<DtoPayment> {
    return this.http.get<ApiResponse<DtoPayment>>(`${this.apiUrl}/order/${orderId}`)
      .pipe(map(res => res.payload as DtoPayment));
  }

  getByUserId(userId: number): Observable<DtoPayment[]> {
    return this.http.get<ApiResponse<DtoPayment[]>>(`${this.apiUrl}/user/${userId}`)
      .pipe(map(res => res.payload as DtoPayment[]));
  }

  isSuccessful(orderId: number): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/order/${orderId}/is-successful`)
      .pipe(map(res => res.payload as boolean));
  }

  updateStatus(orderId: number, newStatus: PaymentStatus, transactionKey?: string): Observable<DtoPayment> {
    let url = `${this.apiUrl}/order/${orderId}/status?newStatus=${newStatus}`;
    if (transactionKey) {
      url += `&transactionKey=${transactionKey}`;
    }
    return this.http.put<ApiResponse<DtoPayment>>(url, {})
      .pipe(map(res => res.payload as DtoPayment));
  }

  refundOrder(orderId: number, orderItemId: number): Observable<DtoPayment> {
    return this.http.post<ApiResponse<DtoPayment>>(`${this.apiUrl}/refund/order/${orderId}/item/${orderItemId}`, {})
      .pipe(map(res => res.payload as DtoPayment));
  }
}
