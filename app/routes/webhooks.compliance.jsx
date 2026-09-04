import { authenticate } from "../shopify.server";
import { purgeShopData } from "../lib/purge-shop-data.server";

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} compliance webhook for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // App does not store customer PII outside Shopify.
      break;
    case "CUSTOMERS_REDACT":
      // App does not store customer PII outside Shopify.
      break;
    case "SHOP_REDACT":
      await purgeShopData(shop);
      break;
    default:
      console.warn(`Unhandled compliance topic: ${topic}`);
  }

  return new Response();
};
