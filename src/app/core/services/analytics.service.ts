import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ApiResponse } from '../../shared/models/api-response';
import { DtoCustomerAnalytics } from '../../shared/models/analytics';

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private readonly apiUrl = `${environment.baseUrl}/analytics`;

    constructor(private http: HttpClient) { }

    getCustomerAnalytics(storeId: number): Observable<DtoCustomerAnalytics> {
        return this.http.get<ApiResponse<DtoCustomerAnalytics>>(`${this.apiUrl}/store/${storeId}/customers`).pipe(
            map(res => res.payload as DtoCustomerAnalytics)
        );
    }
}
