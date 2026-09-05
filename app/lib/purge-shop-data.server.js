import { clearShopPaidPlan } from "./app-pricing.server";
import db from "../db.server";

/** Remove all app data stored for a shop (sessions + settings + billing cache). */
export async function purgeShopData(shop) {
  await db.session.deleteMany({ where: { shop } });
  await db.shopSettings.deleteMany({ where: { shop } }).catch(() => {});
  await clearShopPaidPlan(shop);
}
