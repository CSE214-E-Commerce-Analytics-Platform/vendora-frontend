export interface RestPageableRequest {
    pageNumber: number;
    pageSize: number;
    columnName?: string;
    asc?: boolean;
}

export interface RestPageableEntity<T> {
    content: T[];
    pageNumber: number;
    pageSize: number;
    totalElement: number;
}

import { HttpParams } from '@angular/common/http';

export function buildPageParams(request?: RestPageableRequest): HttpParams {
    let params = new HttpParams()
        .set('pageNumber', request?.pageNumber?.toString() || '0')
        .set('pageSize', request?.pageSize?.toString() || '100');
        
    if (request?.columnName) {
        params = params.set('columnName', request.columnName);
    }
    if (request?.asc !== undefined) {
        params = params.set('asc', request.asc.toString());
    }
    return params;
}
