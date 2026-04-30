import { StoreConfig } from "./stores.js";

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

interface ShopifyQLResponse {
  data?: {
    shopifyqlQuery?: {
      tableData?: {
        columns: Array<{ name: string; dataType: string }>;
        rowData: Array<Array<string | number | null>>;
      };
      parseErrors?: Array<{ code: string; message: string; range?: unknown }>;
    };
  };
  errors?: Array<{ message: string; locations?: unknown }>;
}

export interface QueryResult {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  rowCount: number;
}

export async function runShopifyQL(store: StoreConfig, query: string): Promise<QueryResult> {
  const token = await store.auth.getToken();
  const url = `https://${store.domain}/admin/api/${API_VERSION}/graphql.json`;

  const gql = `
    query ShopifyQL($query: String!) {
      shopifyqlQuery(query: $query) {
        tableData {
          columns { name dataType }
          rowData
        }
        parseErrors { code message }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query: gql, variables: { query } }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify API error ${response.status}: ${body}`);
  }

  const result = (await response.json()) as ShopifyQLResponse;

  if (result.errors?.length) {
    throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join("; ")}`);
  }

  const parseErrors = result.data?.shopifyqlQuery?.parseErrors;
  if (parseErrors?.length) {
    throw new Error(`ShopifyQL parse errors: ${parseErrors.map((e) => `${e.code}: ${e.message}`).join("; ")}`);
  }

  const tableData = result.data?.shopifyqlQuery?.tableData;
  if (!tableData) {
    throw new Error("No table data returned — query may be invalid or return no results");
  }

  return {
    columns: tableData.columns.map((c) => c.name),
    rows: tableData.rowData,
    rowCount: tableData.rowData.length,
  };
}
