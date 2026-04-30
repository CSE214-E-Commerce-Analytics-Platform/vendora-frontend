import { BaseDto } from './base-dto';

export enum MembershipType {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP'
}

export interface DtoCustomerProfile extends BaseDto {
  userId?: number;
  age?: number;
  city?: string;
  state?: string;
  country?: string;
  membershipType?: MembershipType;
}

export interface DtoCustomerProfileRequest {
  age?: number;
  city?: string;
  state?: string;
  country?: string;
}
