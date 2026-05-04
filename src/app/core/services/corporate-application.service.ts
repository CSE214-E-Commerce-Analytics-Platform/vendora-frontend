import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response';
import {
    CorporateApplication,
    CorporateApplicationStatus,
    CorporateCreateRequest,
    CorporateReviewRequest
} from '../../shared/models/corporate-application';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({
    providedIn: 'root'
})
export class CorporateApplicationService {

    private readonly apiUrl = `${environment.baseUrl}/corporate-applications`;

    constructor(private http: HttpClient) { }

    /** Individual: Submit a corporate upgrade request */
    createRequest(request: CorporateCreateRequest): Observable<CorporateApplication> {
        return this.http.post<ApiResponse<CorporateApplication>>(this.apiUrl, request).pipe(
            map(res => res.payload as CorporateApplication)
        );
    }

    /** Individual: Get my latest request */
    findMyLatestRequest(): Observable<CorporateApplication> {
        return this.http.get<ApiResponse<CorporateApplication>>(`${this.apiUrl}/my-request`).pipe(
            map(res => res.payload as CorporateApplication)
        );
    }

    /** Admin: Get request by ID */
    findRequestById(id: number): Observable<CorporateApplication> {
        return this.http.get<ApiResponse<CorporateApplication>>(`${this.apiUrl}/${id}`).pipe(
            map(res => res.payload as CorporateApplication)
        );
    }

    /** Admin: Get request by user email */
    findRequestByUserEmail(email: string): Observable<CorporateApplication> {
        const params = new HttpParams().set('email', email);
        return this.http.get<ApiResponse<CorporateApplication>>(`${this.apiUrl}/email`, { params }).pipe(
            map(res => res.payload as CorporateApplication)
        );
    }

    /** Admin: Approve or reject a request */
    reviewRequest(id: number, reviewDto: CorporateReviewRequest): Observable<CorporateApplication> {
        return this.http.put<ApiResponse<CorporateApplication>>(`${this.apiUrl}/${id}/review`, reviewDto).pipe(
            map(res => res.payload as CorporateApplication)
        );
    }

    /** Admin: Get all requests by status */
    findRequestsByStatus(status: CorporateApplicationStatus, request?: RestPageableRequest): Observable<RestPageableEntity<CorporateApplication>> {
        let params = buildPageParams(request);
        params = params.set('status', status);
        return this.http.get<ApiResponse<RestPageableEntity<CorporateApplication>>>(`${this.apiUrl}/all-by-status`, { params }).pipe(
            map(res => res.payload as RestPageableEntity<CorporateApplication>)
        );
    }
}
