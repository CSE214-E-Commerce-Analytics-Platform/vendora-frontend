import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { DtoCart, DtoCartItemRequest } from '../../shared/models/cart';
import { ApiResponse } from '../../shared/models/api-response';
import { environment } from '../../../environments/environment';
import { RestPageableEntity, RestPageableRequest, buildPageParams } from '../../shared/models/pageable';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/carts`;

  // BehaviorSubject to hold the current cart state dynamically across the UI
  private currentCartSubject = new BehaviorSubject<DtoCart | null>(null);
  public currentCart$ = this.currentCartSubject.asObservable();

  constructor() { }

  /** Refresh the current cart from the server and update BehaviorSubject */
  refreshMyCart(): Observable<ApiResponse<DtoCart>> {
    return this.http.get<ApiResponse<DtoCart>>(`${this.apiUrl}/my-cart`).pipe(
      tap(res => {
        if (res && res.payload) {
          this.currentCartSubject.next(res.payload);
        } else {
          // Handle case where cart might be empty/null from backend
          this.currentCartSubject.next(null);
        }
      })
    );
  }

  /** Add an item to the cart */
  addItemToCart(request: DtoCartItemRequest): Observable<ApiResponse<DtoCart>> {
    return this.http.post<ApiResponse<DtoCart>>(`${this.apiUrl}/add-item`, request).pipe(
      tap(res => {
        if (res && res.payload) {
          this.currentCartSubject.next(res.payload);
        }
      })
    );
  }

  /** Update quantity of an existing cart item */
  updateQuantity(itemId: number, quantity: number): Observable<ApiResponse<DtoCart>> {
    return this.http.put<ApiResponse<DtoCart>>(`${this.apiUrl}/items/${itemId}/quantity/${quantity}`, {}).pipe(
      tap(res => {
        if (res && res.payload) {
          this.currentCartSubject.next(res.payload);
        }
      })
    );
  }

  /** Remove a specific item from the cart */
  removeItem(itemId: number): Observable<ApiResponse<DtoCart>> {
    return this.http.delete<ApiResponse<DtoCart>>(`${this.apiUrl}/items/${itemId}`).pipe(
      tap(res => {
        if (res && res.payload) {
          this.currentCartSubject.next(res.payload);
        }
      })
    );
  }

  /** Clear the entire cart content */
  clearCart(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/clear`).pipe(
      tap(() => {
        // Fetch fresh empty cart to update state, or just emit a mocked empty cart
        this.refreshMyCart().subscribe();
      })
    );
  }

  // --- Admin Endpoints ---

  findAllCarts(request?: RestPageableRequest): Observable<ApiResponse<RestPageableEntity<DtoCart>>> {
    const params = buildPageParams(request);
    return this.http.get<ApiResponse<RestPageableEntity<DtoCart>>>(`${this.apiUrl}/admin/all`, { params });
  }

  findCartByUserId(userId: number): Observable<ApiResponse<DtoCart>> {
    return this.http.get<ApiResponse<DtoCart>>(`${this.apiUrl}/admin/user/${userId}`);
  }

  adminDeleteCart(cartId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/admin/${cartId}`);
  }
}
