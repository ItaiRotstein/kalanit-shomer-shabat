import { authenticate } from "../shopify.server";
import { purgeShopData } from "../lib/purge-shop-data.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await purgeShopData(shop);

  return new Response();
};
