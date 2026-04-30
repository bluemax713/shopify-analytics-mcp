interface AuthConfig {
    clientId: string;
    clientSecret: string;
    shopDomain: string;
}
export declare class ShopifyAuth {
    private config;
    private accessToken;
    private expiresAt;
    constructor(config: AuthConfig);
    getToken(): Promise<string>;
    private fetchToken;
}
export {};
