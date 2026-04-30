import { BaseDto } from './base-dto';

export interface DtoAuditLog extends BaseDto {
    userId: number;
    userRole: string;
    action: string;
    details: string;
}
