import { StoreConfig } from "./stores.js";
export interface QueryResult {
    columns: string[];
    rows: Array<Array<string | number | null>>;
    rowCount: number;
}
export declare function runShopifyQL(store: StoreConfig, query: string): Promise<QueryResult>;
