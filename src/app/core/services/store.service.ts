import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Store, StoreRequest } from '../../shared/models/store';
import { ApiResponse } from '../../shared/models/api-response';
import { environment } from '../../../environments/environment.development';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({
    providedIn: 'root'
})
export class StoreService {

    private readonly apiUrl = `${environment.baseUrl}/stores`;

    constructor(private http: HttpClient) { }

    createStore(store: StoreRequest): Observable<Store> {
        return this.http.post<ApiResponse<Store>>(this.apiUrl, store).pipe(
            map(res => res.payload as Store)
        );
    }

    getMyStores(request?: RestPageableRequest): Observable<RestPageableEntity<Store>> {
        const params = buildPageParams(request);
        return this.http.get<ApiResponse<RestPageableEntity<Store>>>(`${this.apiUrl}/my-stores`, { params }).pipe(
            map(res => res.payload as RestPageableEntity<Store>)
        );
    }

    getStoreById(id: number): Observable<Store> {
        return this.http.get<ApiResponse<Store>>(`${this.apiUrl}/${id}`).pipe(
            map(res => res.payload as Store)
        );
    }

    getAllStores(request?: RestPageableRequest): Observable<RestPageableEntity<Store>> {
        const params = buildPageParams(request);
        return this.http.get<ApiResponse<RestPageableEntity<Store>>>(this.apiUrl, { params }).pipe(
            map(res => res.payload as RestPageableEntity<Store>)
        );
    }

    updateStore(id: number, store: StoreRequest): Observable<Store> {
        return this.http.put<ApiResponse<Store>>(`${this.apiUrl}/${id}`, store).pipe(
            map(res => res.payload as Store)
        );
    }

    deleteStore(id: number): Observable<void> {
        return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
            map(() => void 0)
        );
    }
}
