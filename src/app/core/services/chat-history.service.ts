import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface ChatHistoryItem {
    id: number;
    title: string;
    initialQuery: string;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse<T> {
    status: number;
    payload: T;
    errorMessage?: string;
}

interface PageablePayload<T> {
    content: T[];
    totalElement: number;
}

@Injectable({
    providedIn: 'root'
})
export class ChatHistoryService {

    private readonly baseUrl = `${environment.baseUrl}/chat-histories`;

    constructor(private http: HttpClient) {}

    getAll(): Observable<ChatHistoryItem[]> {
        return this.http.get<ApiResponse<PageablePayload<ChatHistoryItem>>>(
            this.baseUrl, { params: { pageNumber: '0', pageSize: '100' } }
        ).pipe(
            map(res => res.payload?.content ?? [])
        );
    }

    create(title: string, initialQuery: string): Observable<ChatHistoryItem> {
        return this.http.post<ApiResponse<ChatHistoryItem>>(this.baseUrl, { title, initialQuery }).pipe(
            map(res => res.payload)
        );
    }

    updateTitle(id: number, title: string): Observable<ChatHistoryItem> {
        return this.http.patch<ApiResponse<ChatHistoryItem>>(`${this.baseUrl}/${id}/title`, { title }).pipe(
            map(res => res.payload)
        );
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
