export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_SHIPPED = 'PARTIALLY_SHIPPED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface DtoOrderRequest {
  addressId: number;
}

export interface DtoOrderItem {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface DtoOrder {
  id?: number;
  status: OrderStatus;
  grandTotal: number;
  orderDate: string;
  storeId?: number;
  storeName?: string;
  parentOrderId?: number;
  items: DtoOrderItem[];
  subOrders: DtoOrder[];
  fullAddress?: string;
}
