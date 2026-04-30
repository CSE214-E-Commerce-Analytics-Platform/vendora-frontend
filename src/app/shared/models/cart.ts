export interface DtoCartItemRequest {
    productId: number;
    quantity: number;
}

export interface DtoCartRequest {
    userId?: number;
}

export interface DtoCartItem {
    id: number;
    createTime?: Date;
    updateTime?: Date;
    quantity: number;
    productId: number;
    productName: string;
    productPrice: number;
    productImageUrl: string;
    totalLinePrice: number;
}

export interface DtoCart {
    id: number;
    createTime?: Date;
    updateTime?: Date;
    userId: number;
    items: DtoCartItem[];
    totalPrice: number;
    totalItems: number;
}
