import { ShopifyAuth } from "./auth.js";
export interface StoreConfig {
    id: string;
    domain: string;
    auth: ShopifyAuth;
}
export declare function loadStores(): Map<string, StoreConfig>;
