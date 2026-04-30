export interface User {
    id: number;
    email: string;
    roleType: string;
    active?: boolean;
    isActive?: boolean;
    storeId?: number;
}

export interface UserRequest {
    email?: string;
    password?: string;
    roleType?: string;
    active?: boolean;
    isActive?: boolean;
}