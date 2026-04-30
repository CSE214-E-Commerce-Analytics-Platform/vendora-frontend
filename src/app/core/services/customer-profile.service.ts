import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../shared/models/api-response';
import { DtoCustomerProfile, DtoCustomerProfileRequest } from '../../shared/models/customer-profile';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class CustomerProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/customer-profiles`;

  getMyProfile(): Observable<DtoCustomerProfile> {
    return this.http.get<ApiResponse<DtoCustomerProfile>>(`${this.apiUrl}/my-profile`)
      .pipe(map(res => res.payload as DtoCustomerProfile));
  }

  updateMyProfile(request: DtoCustomerProfileRequest): Observable<DtoCustomerProfile> {
    return this.http.put<ApiResponse<DtoCustomerProfile>>(`${this.apiUrl}/my-profile/update`, request)
      .pipe(map(res => res.payload as DtoCustomerProfile));
  }

  upgradeMembership(newType: string): Observable<DtoCustomerProfile> {
    return this.http.put<ApiResponse<DtoCustomerProfile>>(`${this.apiUrl}/my-profile/upgrade-membership`, { membershipType: newType })
      .pipe(map(res => res.payload as DtoCustomerProfile));
  }
}
