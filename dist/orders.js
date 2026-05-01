const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
const ORDER_FIELDS = `
  id
  name
  createdAt
  displayFinancialStatus
  cancelledAt
  totalPriceSet { shopMoney { amount currencyCode } }
  subtotalPriceSet { shopMoney { amount currencyCode } }
  totalShippingPriceSet { shopMoney { amount currencyCode } }
  totalDiscountsSet { shopMoney { amount currencyCode } }
  currentTotalRefundsSet { shopMoney { amount currencyCode } }
`;
async function fetchPage(domain, token, queryStr, cursor) {
    const url = `https://${domain}/admin/api/${API_VERSION}/graphql.json`;
    const gql = `
    query Orders($query: String!, $cursor: String) {
      orders(first: 250, query: $query, after: $cursor) {
        edges { node { ${ORDER_FIELDS} } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query: gql, variables: { query: queryStr, cursor } }),
    });
    if (!response.ok) {
        throw new Error(`Shopify API error ${response.status}: ${await response.text()}`);
    }
    const result = (await response.json());
    if (result.errors?.length) {
        throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join("; ")}`);
    }
    const orders = result.data?.orders;
    if (!orders)
        throw new Error("No orders data returned");
    return orders;
}
export async function queryOrdersByDate(store, dateFrom, dateTo) {
    const token = await store.auth.getToken();
    // Shopify query filter: created_at range, only non-cancelled, paid/partially-paid
    const queryStr = `created_at:>='${dateFrom}' created_at:<='${dateTo}T23:59:59' -financial_status:pending`;
    const allOrders = [];
    let cursor = null;
    do {
        const page = await fetchPage(store.domain, token, queryStr, cursor);
        for (const { node } of page.edges) {
            // Skip cancelled orders from net sales
            if (node.cancelledAt)
                continue;
            allOrders.push(node);
        }
        cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);
    const currency = allOrders[0]?.totalPriceSet.shopMoney.currencyCode ?? "USD";
    const parse = (v) => parseFloat(v) || 0;
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalShipping = 0;
    let totalRefunds = 0;
    const orderList = allOrders.map((o) => {
        const gross = parse(o.subtotalPriceSet.shopMoney.amount) + parse(o.totalDiscountsSet.shopMoney.amount);
        const discounts = parse(o.totalDiscountsSet.shopMoney.amount);
        const shipping = parse(o.totalShippingPriceSet.shopMoney.amount);
        const refunds = parse(o.currentTotalRefundsSet.shopMoney.amount);
        const net = parse(o.subtotalPriceSet.shopMoney.amount) - refunds;
        grossSales += gross;
        totalDiscounts += discounts;
        totalShipping += shipping;
        totalRefunds += refunds;
        return {
            id: o.id,
            name: o.name,
            created_at: o.createdAt,
            status: o.displayFinancialStatus,
            gross: Math.round(gross * 100) / 100,
            discounts: Math.round(discounts * 100) / 100,
            shipping: Math.round(shipping * 100) / 100,
            refunds: Math.round(refunds * 100) / 100,
            net: Math.round(net * 100) / 100,
        };
    });
    const netSales = grossSales - totalDiscounts - totalRefunds;
    return {
        date_from: dateFrom,
        date_to: dateTo,
        store: store.id,
        order_count: allOrders.length,
        gross_sales: Math.round(grossSales * 100) / 100,
        total_discounts: Math.round(totalDiscounts * 100) / 100,
        total_shipping: Math.round(totalShipping * 100) / 100,
        total_refunds: Math.round(totalRefunds * 100) / 100,
        net_sales: Math.round(netSales * 100) / 100,
        currency,
        orders: orderList,
    };
}
