#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadStores } from "./stores.js";
import { runShopifyQL } from "./shopifyql.js";
import { queryOrdersByDate } from "./orders.js";

const stores = loadStores();

if (stores.size === 0) {
  console.error(
    "[shopify-analytics-mcp] No stores configured. Set SHOPIFY_STORES=ra,pb and " +
    "SHOPIFY_RA_DOMAIN / SHOPIFY_RA_CLIENT_ID / SHOPIFY_RA_CLIENT_SECRET for each store."
  );
  process.exit(1);
}

const server = new McpServer({
  name: "shopify-analytics",
  version: "1.0.0",
  description: "ShopifyQL analytics queries — multi-store, read-only",
});

server.tool(
  "list_stores",
  "List the Shopify stores available for analytics queries",
  {},
  async () => {
    const list = Array.from(stores.values()).map((s) => ({ id: s.id, domain: s.domain }));
    return {
      content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
    };
  }
);

server.tool(
  "run_shopifyql",
  "Run a ShopifyQL query against a Shopify store. Returns tabular results. " +
  "Example queries: " +
  "\"FROM sales WHERE date >= '2026-04-01' AND date <= '2026-04-30' SELECT day, sum(net_sales) ORDER BY day\" — " +
  "\"FROM products SELECT title, sum(net_quantity) GROUP BY title ORDER BY sum(net_quantity) DESC LIMIT 10\"",
  {
    store: z
      .string()
      .describe(
        "Store ID to query. Use list_stores to see available IDs. " +
        "Common values: 'ra' (Rosie Assoulin), 'pb' (Palm Beach)."
      ),
    query: z.string().describe("ShopifyQL query string"),
  },
  async ({ store, query }) => {
    const storeConfig = stores.get(store);
    if (!storeConfig) {
      const available = Array.from(stores.keys()).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Unknown store "${store}". Available stores: ${available}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await runShopifyQL(storeConfig, query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Query failed: ${message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "query_orders_by_date",
  "Query orders and compute sales metrics for a date range. Works on all Shopify plans. " +
  "Returns order count, gross sales, discounts, shipping, refunds, and net sales. " +
  "Also returns individual order breakdown. Use run_shopifyql instead if the store is on Shopify Plus.",
  {
    store: z
      .string()
      .describe("Store ID to query. Use list_stores to see available IDs."),
    date_from: z
      .string()
      .describe("Start date in YYYY-MM-DD format (inclusive)"),
    date_to: z
      .string()
      .describe("End date in YYYY-MM-DD format (inclusive). Use same date as date_from for a single day."),
  },
  async ({ store, date_from, date_to }) => {
    const storeConfig = stores.get(store);
    if (!storeConfig) {
      const available = Array.from(stores.keys()).join(", ");
      return {
        content: [{ type: "text", text: `Unknown store "${store}". Available stores: ${available}` }],
        isError: true,
      };
    }

    try {
      const result = await queryOrdersByDate(storeConfig, date_from, date_to);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Query failed: ${message}` }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
