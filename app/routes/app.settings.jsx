import { useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ISRAEL_CITIES } from "../lib/israel-cities.server";
import { CLOSURE_MODES } from "../lib/closure-modes.js";
import {
  getShopSettings,
  saveShopSettings,
} from "../lib/shop-settings.server";
import { themeEditorAppsUrl } from "../lib/theme-embed.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);

  return {
    settings,
    cities: ISRAEL_CITIES,
    themeEditorUrl: themeEditorAppsUrl(session.shop),
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const closureMode = form.get("closureMode");
  const geonameId = Number(form.get("geonameId"));

  if (
    closureMode !== CLOSURE_MODES.SHABBAT_ONLY &&
    closureMode !== CLOSURE_MODES.SHABBAT_AND_HOLIDAYS
  ) {
    return { ok: false, error: "יש לבחור מצב סגירה תקין." };
  }

  if (!ISRAEL_CITIES.some((city) => city.geonameId === geonameId)) {
    return { ok: false, error: "יש לבחור עיר תקינה." };
  }

  try {
    await saveShopSettings(session.shop, {
      closureMode: String(closureMode),
      geonameId,
    });
  } catch {
    return { ok: false, error: "לא ניתן לשמור את ההגדרות." };
  }

  return { ok: true, closureMode: String(closureMode), geonameId };
};

export default function Settings() {
  const { settings, cities, themeEditorUrl } = useLoaderData();
  const fetcher = useFetcher();

  const savedMode =
    fetcher.data?.ok && fetcher.data.closureMode
      ? fetcher.data.closureMode
      : settings.closureMode;

  const savedGeonameId =
    fetcher.data?.ok && fetcher.data.geonameId
      ? fetcher.data.geonameId
      : settings.geonameId;

  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data?.ok &&
      typeof shopify !== "undefined"
    ) {
      shopify.toast.show("ההגדרות נשמרו");
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <s-page heading="הגדרות">
      <fetcher.Form
        key={`${savedMode}-${savedGeonameId}`}
        method="post"
        data-save-bar
      >
        <s-section heading="מתי החנות נסגרת">
          <s-stack direction="block" gap="base">
            <label>
              <input
                type="radio"
                name="closureMode"
                value={CLOSURE_MODES.SHABBAT_AND_HOLIDAYS}
                defaultChecked={
                  savedMode === CLOSURE_MODES.SHABBAT_AND_HOLIDAYS
                }
              />{" "}
              שבת וחגים - החנות סגורה בכל שבת ובכל חג (כולל ערב חג)
            </label>
            <label>
              <input
                type="radio"
                name="closureMode"
                value={CLOSURE_MODES.SHABBAT_ONLY}
                defaultChecked={savedMode === CLOSURE_MODES.SHABBAT_ONLY}
              />{" "}
              שבת בלבד - החנות סגורה בכל שבת
            </label>
          </s-stack>
        </s-section>

        <s-box paddingBlockStart="large">
          <s-section heading="מיקום">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                זמני הדלקת נרות והבדלה לפי העיר שנבחרה (לוח שנה: ישראל).
              </s-paragraph>
              <label>
                עיר:{" "}
                <select name="geonameId" defaultValue={String(savedGeonameId)}>
                  {cities.map((city) => (
                    <option key={city.geonameId} value={city.geonameId}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>
            </s-stack>
          </s-section>
        </s-box>

        {fetcher.data?.error && (
          <s-box paddingBlockStart="base">
            <s-banner tone="critical">{fetcher.data.error}</s-banner>
          </s-box>
        )}
      </fetcher.Form>

      <s-section slot="aside" heading="איך זה עובד?">
        <s-paragraph>
          ההגדרות שלפניך קובעות את הזמנים והמיקום של כניסת/יציאת השבת. את התוסף
          יש להפעיל מתוך{" "}
          <s-link href={themeEditorUrl} target="_blank">
            עורך התבנית
          </s-link>
          .
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
