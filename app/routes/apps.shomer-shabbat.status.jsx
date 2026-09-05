import { shopHasPaidPlan } from "../lib/app-pricing.server";
import { getShabbatStatus } from "../lib/hebcal.server";
import { getShopSettings } from "../lib/shop-settings.server";
import { authenticate } from "../shopify.server";

const DEFAULT_MESSAGES = {
  shabbat: {
    heading: "שבת שלום ומבורך",
    body: "החנות סגורה לכבוד שבת קודש. נשוב לפעילות לאחר צאת השבת.",
  },
  holiday: {
    heading: "חג שמח",
    body: "החנות סגורה לרגל החג. נשוב לפעילות במוצאי החג.",
  },
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop =
    session?.shop ?? new URL(request.url).searchParams.get("shop");

  if (!shop) {
    return Response.json(
      { ok: false, error: "Missing shop", isClosed: false },
      { status: 400 },
    );
  }

  const [settings, hasPaidPlan] = await Promise.all([
    getShopSettings(shop),
    shopHasPaidPlan(shop),
  ]);

  const status = await getShabbatStatus({
    geonameId: settings.geonameId,
    includeHolidays: settings.includeHolidays,
  });

  return Response.json(
    {
      ...status,
      isClosed: hasPaidPlan ? status.isClosed : false,
      messages: DEFAULT_MESSAGES,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    },
  );
};
