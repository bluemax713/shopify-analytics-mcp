interface AuthConfig {
  clientId: string;
  clientSecret: string;
  shopDomain: string;
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
}

export class ShopifyAuth {
  private config: AuthConfig;
  private accessToken: string | null = null;
  private expiresAt: number | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async getToken(): Promise<string> {
    if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt - 60_000) {
      return this.accessToken;
    }
    return this.fetchToken();
  }

  private async fetchToken(): Promise<string> {
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

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.expiresAt = data.expires_in
      ? Date.now() + data.expires_in * 1000
      : Date.now() + 50 * 60 * 1000; // default 50min if not specified

    return this.accessToken;
  }
}
