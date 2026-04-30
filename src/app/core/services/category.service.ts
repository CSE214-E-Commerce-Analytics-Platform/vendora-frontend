import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Category, CategoryRequest } from '../../shared/models/category';
import { ApiResponse } from '../../shared/models/api-response';
import { environment } from '../../../environments/environment.development';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {

    private readonly apiUrl = `${environment.baseUrl}/categories`;

    constructor(private http: HttpClient) { }

    createCategory(category: CategoryRequest): Observable<Category> {
        return this.http.post<ApiResponse<Category>>(this.apiUrl, category).pipe(
            map(res => res.payload as Category)
        );
    }

    getAllCategories(request?: RestPageableRequest): Observable<RestPageableEntity<Category>> {
        const params = buildPageParams(request);
        return this.http.get<ApiResponse<RestPageableEntity<Category>>>(this.apiUrl, { params }).pipe(
            map(res => res.payload as RestPageableEntity<Category>)
        );
    }

    updateCategoryById(id: number, category: CategoryRequest): Observable<Category> {
        return this.http.put<ApiResponse<Category>>(`${this.apiUrl}/${id}`, category).pipe(
            map(res => res.payload as Category)
        );
    }

    deleteCategoryById(id: number): Observable<void> {
        return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
            map(() => void 0)
        );
    }
}
