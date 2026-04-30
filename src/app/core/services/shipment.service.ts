import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../shared/models/api-response';
import { DtoShipment, DtoShipmentRequest, ShipmentStatus } from '../../shared/models/shipment';
import { environment } from '../../../environments/environment.development';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({ providedIn: 'root' })
export class ShipmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/shipments`;

  initialize(request: DtoShipmentRequest): Observable<DtoShipment> {
    return this.http.post<ApiResponse<DtoShipment>>(`${this.apiUrl}/initialize`, request)
      .pipe(map(res => res.payload as DtoShipment));
  }

  updateStatus(shipmentId: number, newStatus: ShipmentStatus): Observable<DtoShipment> {
    return this.http.put<ApiResponse<DtoShipment>>(`${this.apiUrl}/${shipmentId}/status?newStatus=${newStatus}`, {})
      .pipe(map(res => res.payload as DtoShipment));
  }

  track(trackingNumber: string): Observable<DtoShipment> {
    return this.http.get<ApiResponse<DtoShipment>>(`${this.apiUrl}/track/${trackingNumber}`)
      .pipe(map(res => res.payload as DtoShipment));
  }

  cancel(shipmentId: number): Observable<DtoShipment> {
    return this.http.put<ApiResponse<DtoShipment>>(`${this.apiUrl}/${shipmentId}/cancel`, {})
      .pipe(map(res => res.payload as DtoShipment));
  }

  getAll(request?: RestPageableRequest): Observable<RestPageableEntity<DtoShipment>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoShipment>>>(this.apiUrl, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoShipment>));
  }

  getMyShipments(request?: RestPageableRequest): Observable<RestPageableEntity<DtoShipment>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoShipment>>>(`${this.apiUrl}/my-shipments`, { params })
      .pipe(map(res => res.payload as RestPageableEntity<DtoShipment>));
  }

  getById(id: number): Observable<DtoShipment> {
    return this.http.get<ApiResponse<DtoShipment>>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.payload as DtoShipment));
  }

  getByOrderId(orderId: number): Observable<DtoShipment> {
    return this.http.get<ApiResponse<DtoShipment>>(`${this.apiUrl}/order/${orderId}`)
      .pipe(map(res => res.payload as DtoShipment));
  }
}
