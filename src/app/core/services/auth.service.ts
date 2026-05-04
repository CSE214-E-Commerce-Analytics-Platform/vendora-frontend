import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthResponse } from '../../shared/models/auth-response';
import { tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly ROLE_KEY = 'role';

  private readonly API_URL = environment.baseUrl + '/auth';

  constructor(private http: HttpClient, private router: Router) { }

  login(email: string, password: string) {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, { email, password }, { withCredentials: true }
    ).pipe(
      map(response => {
        if (response.status === 200 && response.payload) {
          return response.payload;
        }
        throw new Error(response.errorMessage || response.message || 'An error occur');
      }),
      tap(auth => {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, auth.accessToken);
        localStorage.setItem(this.ROLE_KEY, auth.role);
      })
    );
  }

  register(email: string, password: string, age?: number | null, city?: string | null, state?: string | null, country?: string | null) {
    const payload = { email, password, age, city, state, country };
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/register`, payload, { withCredentials: true })
      .pipe(
        map(response => {
          if (response.status === 200 && response.payload) {
            return response.payload;
          }
          throw new Error(response.errorMessage || response.message || 'An error occurred');
        })
      );
  }

  verifyEmail(token: string) {
    return this.http.get<ApiResponse<string>>(`${this.API_URL}/verify-email?token=${token}`)
      .pipe(
        map(response => {
          if (response.status === 200 && response.payload) {
            return response.payload;
          }
          throw new Error(response.errorMessage || response.message || 'An error occurred during verification');
        })
      );
  }

  forgotPassword(email: string) {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/forgot-password`, { email })
      .pipe(
        map(response => {
          if (response.status === 200 && response.payload) {
            return response.payload;
          }
          throw new Error(response.errorMessage || response.message || 'An error occurred');
        })
      );
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/reset-password`, { token, newPassword })
      .pipe(
        map(response => {
          if (response.status === 200 && response.payload) {
            return response.payload;
          }
          throw new Error(response.errorMessage || response.message || 'An error occurred');
        })
      );
  }

  logout() {
    return this.http.post(`${this.API_URL}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearStorage()));
  }

  refreshToken() {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/refresh`, {}, { withCredentials: true })
      .pipe(
        map(response => {
          if (response.status === 200 && response.payload) {
            return response.payload;
          }
          throw new Error(response.errorMessage || response.message || 'Token could not reload');
        }),
        tap(auth => {
          localStorage.setItem(this.ACCESS_TOKEN_KEY, auth.accessToken);
        })
      );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getCurrentUserEmail(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  setAuthData(token: string, role: string) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    localStorage.setItem(this.ROLE_KEY, role);
  }

  clearStorage() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
  }
}
