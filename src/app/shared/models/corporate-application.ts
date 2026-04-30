export interface CorporateApplication {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    companyName: string;
    reason: string;
    status: CorporateApplicationStatus;
    adminNote: string;
}

export type CorporateApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CorporateCreateRequest {
    reason: string;
    companyName: string;
}

export interface CorporateReviewRequest {
    status: CorporateApplicationStatus;
    adminNote: string;
}
