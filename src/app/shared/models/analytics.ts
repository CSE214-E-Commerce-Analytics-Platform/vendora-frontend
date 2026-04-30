export interface DtoTopCustomer {
    userId: number;
    email: string;
    totalOrders: number;
    totalSpend: number;
}

export interface DtoCustomerSegment {
    name: string;
    count: number;
}

export interface DtoCustomerAnalytics {
    totalCustomers: number;
    segments: DtoCustomerSegment[];
    topCustomers: DtoTopCustomer[];
}
