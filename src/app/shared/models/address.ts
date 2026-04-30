import { BaseDto } from './base-dto';

export interface DtoAddressRequest {
  city: string;
  district: string;
  fullAddress: string;
  phoneNumber: string;
  zipCode: string;
}

export interface DtoAddress extends BaseDto {
  city: string;
  district: string;
  fullAddress: string;
  phoneNumber: string;
  zipCode: string;
}
