export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface DtoPaymentRequest {
  orderId: number;
  stripeToken?: string;
  paymentMethod?: PaymentMethod;
}

export interface DtoPayment {
  id?: number;
  orderId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionKey: string;
  errorMessage?: string;
}
