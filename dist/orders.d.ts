import { StoreConfig } from "./stores.js";
export interface OrderSummary {
    date_from: string;
    date_to: string;
    store: string;
    order_count: number;
    gross_sales: number;
    total_discounts: number;
    total_shipping: number;
    total_refunds: number;
    net_sales: number;
    currency: string;
    orders: Array<{
        id: string;
        name: string;
        created_at: string;
        status: string;
        gross: number;
        discounts: number;
        shipping: number;
        refunds: number;
        net: number;
    }>;
}
export declare function queryOrdersByDate(store: StoreConfig, dateFrom: string, dateTo: string): Promise<OrderSummary>;
