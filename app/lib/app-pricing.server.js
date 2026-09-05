import { Prisma } from "@prisma/client";
import prisma from "../db.server";

const APP_HANDLE_FALLBACK = "shomer-shabbat";
const PARTNER_API_VERSION = "2026-07";

const BILLING_CONTEXT_QUERY = `#graphql
  query ShomerShabbatBillingContext {
    shop {
      id
    }
    currentAppInstallation {
      app {
        id
        handle
      }
    }
  }
`;

let billingTableReady = false;

async function ensureBillingTable() {
  if (billingTableReady) return;

  await prisma.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS "AppBilling" (
      "shop" TEXT NOT NULL PRIMARY KEY,
      "active" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL
    )
  `);
  billingTableReady = true;
}

/**
 * @param {string} shop
 */
export async function shopHasPaidPlan(shop) {
  try {
    await ensureBillingTable();
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT "active" FROM "AppBilling" WHERE "shop" = ${shop}
    `);
    return Boolean(rows?.[0]?.active);
  } catch {
    return false;
  }
}

/**
 * @param {string} shop
 */
export async function clearShopPaidPlan(shop) {
  try {
    await ensureBillingTable();
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "AppBilling" WHERE "shop" = ${shop}
    `);
  } catch {
    // Uninstall should still succeed if the cache table is missing.
  }
}

/**
 * @param {string} shop
 * @param {boolean} active
 */
export async function setShopPaidPlan(shop, active) {
  try {
    await ensureBillingTable();
    const updatedAt = new Date().toISOString();
    const flag = active ? 1 : 0;
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "AppBilling" ("shop", "active", "updatedAt")
      VALUES (${shop}, ${flag}, ${updatedAt})
      ON CONFLICT("shop") DO UPDATE SET
        "active" = ${flag},
        "updatedAt" = ${updatedAt}
    `);
  } catch {
    // Paywall still runs from Shopify; cache is best-effort.
  }
}

function hasPartnerApiConfig() {
  return Boolean(
    process.env.SHOPIFY_PARTNER_ORG_ID &&
      process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN,
  );
}

function selectedPlanHandle(request) {
  const value = new URL(request.url).searchParams.get("plan_handle");
  if (!value || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value)) return null;
  return value;
}

/**
 * @param {string} shopId
 * @param {string} appId
 */
export async function fetchActiveSubscription(shopId, appId) {
  const orgId = process.env.SHOPIFY_PARTNER_ORG_ID;
  const token = process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN;
  if (!orgId || !token) return null;

  const response = await fetch(
    `https://partners.shopify.com/${orgId}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query: `query ActiveSubscription($appId: ID!, $shopId: ID!) {
          activeSubscription(appId: $appId, shopId: $shopId) { billingPeriod }
        }`,
        variables: { appId, shopId },
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(
      `Partner API request failed: ${JSON.stringify(payload.errors ?? response.status)}`,
    );
  }

  return payload.data?.activeSubscription ?? null;
}

/**
 * Redirect unpaid shops to Shopify's hosted plan page.
 * Trial / $4.99 starts only after the merchant picks a plan there.
 *
 * @param {{
 *   request: Request,
 *   billing: { check: () => Promise<{ hasActivePayment: boolean }> },
 *   admin: { graphql: (query: string) => Promise<Response> },
 *   redirect: (url: string, init?: { target?: string }) => Response,
 *   session: { shop: string },
 * }} context
 */
export async function ensureAppPricingAccess({
  request,
  billing,
  admin,
  redirect,
  session,
}) {
  const { hasActivePayment } = await billing.check();

  const contextResponse = await admin.graphql(BILLING_CONTEXT_QUERY);
  const contextJson = await contextResponse.json();
  if (contextJson.errors?.length) {
    throw new Error(contextJson.errors.map((error) => error.message).join("; "));
  }

  const shopId = contextJson.data?.shop?.id;
  const appId = contextJson.data?.currentAppInstallation?.app?.id;
  const appHandle =
    contextJson.data?.currentAppInstallation?.app?.handle || APP_HANDLE_FALLBACK;

  let partnerSubscription = null;
  if (hasPartnerApiConfig() && shopId && appId) {
    partnerSubscription = await fetchActiveSubscription(shopId, appId);
  }

  const justSelectedPlan = Boolean(selectedPlanHandle(request));
  const cachedPaid = await shopHasPaidPlan(session.shop);

  const allowed = hasPartnerApiConfig()
    ? Boolean(partnerSubscription) || justSelectedPlan
    : hasActivePayment || cachedPaid || justSelectedPlan;

  if (allowed) {
    if (hasActivePayment || partnerSubscription || justSelectedPlan) {
      await setShopPaidPlan(session.shop, true);
    }
    return null;
  }

  if (cachedPaid) {
    await setShopPaidPlan(session.shop, false);
  }

  const storeHandle = session.shop.replace(/\.myshopify\.com$/i, "");
  return redirect(
    `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`,
    { target: "_top" },
  );
}
