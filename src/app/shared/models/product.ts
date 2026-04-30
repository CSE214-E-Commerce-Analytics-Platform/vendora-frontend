export interface Product {
    id: number;
    createdAt?: string;
    updatedAt?: string;
    name: string;
    description: string;
    imageUrl: string;
    sku: string;
    unitPrice: number;
    stockQuantity: number;
    storeId: number;
    categoryName: string;
}

export interface ProductRequest {
    name: string;
    description: string;
    imageUrl: string;
    sku: string;
    unitPrice: number;
    stockQuantity: number;
    categoryId: number | null;
    storeId: number;
}