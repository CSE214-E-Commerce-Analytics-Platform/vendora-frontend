export interface ApiResponse<T> {
    status: number;
    payload?: T;
    errorMessage?: string;
    message?: string;
}
