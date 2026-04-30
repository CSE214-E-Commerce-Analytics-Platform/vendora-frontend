export interface Store {
    id: number;
    createdAt: string; // Using string to handle LocalDateTime
    updatedAt: string;
    name: string;
    status: string;
    ownerId: number;
}

export interface StoreRequest {
    name: string;
}
