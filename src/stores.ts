import { ShopifyAuth } from "./auth.js";

export interface StoreConfig {
  id: string;
  domain: string;
  auth: ShopifyAuth;
}

// Reads SHOPIFY_STORES=ra,pb and then per-store:
//   SHOPIFY_<ID>_DOMAIN, SHOPIFY_<ID>_CLIENT_ID, SHOPIFY_<ID>_CLIENT_SECRET
// Also supports a default single-store via SHOPIFY_DOMAIN + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
export function loadStores(): Map<string, StoreConfig> {
  const stores = new Map<string, StoreConfig>();

  const storeList = process.env.SHOPIFY_STORES;
  if (storeList) {
    for (const id of storeList.split(",").map((s) => s.trim()).filter(Boolean)) {
      const prefix = `SHOPIFY_${id.toUpperCase()}`;
      const domain = process.env[`${prefix}_DOMAIN`];
      const clientId = process.env[`${prefix}_CLIENT_ID`];
      const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];

      if (!domain || !clientId || !clientSecret) {
        console.error(
          `[shopify-analytics-mcp] WARNING: store "${id}" missing ${prefix}_DOMAIN / _CLIENT_ID / _CLIENT_SECRET — skipping`
        );
        continue;
      }

      stores.set(id, {
        id,
        domain,
        auth: new ShopifyAuth({ clientId, clientSecret, shopDomain: domain }),
      });
    }
  }

  // Single-store fallback
  const domain = process.env.SHOPIFY_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (domain && clientId && clientSecret && stores.size === 0) {
    stores.set("default", {
      id: "default",
      domain,
      auth: new ShopifyAuth({ clientId, clientSecret, shopDomain: domain }),
    });
  }

  return stores;
}
