import { BaseDto } from './base-dto';

export enum ShipmentStatus {
  PENDING = 'PENDING',
  LABEL_CREATED = 'LABEL_CREATED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

export interface DtoShipment extends BaseDto {
  orderId: number;
  trackingNumber: string;
  warehouse: string;
  mode: string;
  status: ShipmentStatus;
  estimatedDeliveryDate: string;
  deliveryAddress: string;
}

export interface DtoShipmentRequest {
  childOrderId: number;
  warehouse: string;
  mode: string;
}
