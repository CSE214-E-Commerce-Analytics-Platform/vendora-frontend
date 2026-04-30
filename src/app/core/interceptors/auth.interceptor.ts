import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, catchError, filter, Observable, switchMap, take, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";
import { Router } from "@angular/router";
import { AuthResponse } from "../../shared/models/auth-response";
import { Token } from "@angular/compiler";


@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    private isRefreshing = false;
    private refreshSubject = new BehaviorSubject<string | null>(null);

    constructor(private authService: AuthService, private router: Router) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        if (req.url.includes('/auth/refresh') ||
            req.url.includes('/auth/login') ||
            req.url.includes('/auth/register')) {

            return next.handle(req);
        }

        const token = this.authService.getAccessToken();
        if (token) {
            req = this.addToken(req, token);
        }

        return next.handle(req).pipe(
            catchError(error => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    return this.handle401(req, next);
                }
                return throwError(() => error);
            })
        );
    }

    private handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshSubject.next(null);

            return this.authService.refreshToken().pipe(
                switchMap((auth: AuthResponse) => {
                    this.isRefreshing = false;
                    this.refreshSubject.next(auth.accessToken);
                    return next.handle(this.addToken(req, auth.accessToken));
                }),
                catchError(error => {
                    this.isRefreshing = false;
                    this.authService.clearStorage();
                    this.router.navigate(['/login']);
                    return throwError(() => error);
                })
            );
        }

        return this.refreshSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => next.handle(this.addToken(req, token!)))
        );
    }


    private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
        return req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
    }
}