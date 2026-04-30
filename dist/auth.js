export class ShopifyAuth {
    config;
    accessToken = null;
    expiresAt = null;
    constructor(config) {
        this.config = config;
    }
    async getToken() {
        if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt - 60_000) {
            return this.accessToken;
        }
        return this.fetchToken();
    }
    async fetchToken() {
        const url = `https://${this.config.shopDomain}/admin/oauth/access_token`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "client_credentials",
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Shopify token exchange failed for ${this.config.shopDomain}: ${response.status} ${body}`);
        }
        const data = (await response.json());
        this.accessToken = data.access_token;
        this.expiresAt = data.expires_in
            ? Date.now() + data.expires_in * 1000
            : Date.now() + 50 * 60 * 1000; // default 50min if not specified
        return this.accessToken;
    }
}
