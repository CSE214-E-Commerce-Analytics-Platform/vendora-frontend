import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Product, ProductRequest } from '../../shared/models/product';
import { ApiResponse } from '../../shared/models/api-response';
import { environment } from '../../../environments/environment';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({
    providedIn: 'root'
})
export class ProductService {

    private readonly apiUrl = `${environment.baseUrl}/products`;

    constructor(private http: HttpClient) { }

    getProducts(request?: RestPageableRequest): Observable<RestPageableEntity<Product>> {
        const params = buildPageParams(request);
        return this.http.get<ApiResponse<RestPageableEntity<Product>>>(this.apiUrl, { params }).pipe(
            map(res => res.payload as RestPageableEntity<Product>)
        );
    }

    getProductById(id: number): Observable<Product> {
        return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`).pipe(
            map(res => res.payload as Product)
        );
    }

    getProductsByStoreId(storeId: number, request?: RestPageableRequest): Observable<RestPageableEntity<Product>> {
        const params = buildPageParams(request);
        return this.http.get<ApiResponse<RestPageableEntity<Product>>>(`${this.apiUrl}/store/${storeId}`, { params }).pipe(
            map(res => res.payload as RestPageableEntity<Product>)
        );
    }

    createProduct(product: ProductRequest): Observable<Product> {
        return this.http.post<ApiResponse<Product>>(this.apiUrl, product).pipe(
            map(res => res.payload as Product)
        );
    }

    updateProduct(id: number, product: ProductRequest): Observable<Product> {
        return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, product).pipe(
            map(res => res.payload as Product)
        );
    }

    deleteProduct(id: number): Observable<void> {
        return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
            map(() => void 0)
        );
    }
}

