import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ApiResponse } from '../../shared/models/api-response';
import { DtoAuditLog } from '../../shared/models/audit-log';
import { RestPageableEntity, RestPageableRequest } from '../../shared/models/pageable';

@Injectable({
    providedIn: 'root'
})
export class AdminAuditService {
    private readonly apiUrl = `${environment.baseUrl}/admin/audit-logs`;

    constructor(private http: HttpClient) { }

    getAuditLogs(request: RestPageableRequest): Observable<RestPageableEntity<DtoAuditLog>> {
        let params = new HttpParams()
            .set('pageNumber', request.pageNumber.toString())
            .set('pageSize', request.pageSize.toString());
            
        if (request.columnName) {
            params = params.set('columnName', request.columnName);
        }
        if (request.asc !== undefined) {
            params = params.set('asc', request.asc.toString());
        }

        return this.http.get<ApiResponse<RestPageableEntity<DtoAuditLog>>>(this.apiUrl, { params }).pipe(
            map(res => res.payload as RestPageableEntity<DtoAuditLog>)
        );
    }
}
