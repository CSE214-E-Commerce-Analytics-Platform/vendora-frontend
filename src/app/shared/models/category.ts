export interface Category {
    id: number;
    createdAt: string; // Using string to handle LocalDateTime
    updatedAt: string;
    name: string;
    parentId: number | null;
}

export interface CategoryRequest {
    name: string;
    parentId: number | null;
}
