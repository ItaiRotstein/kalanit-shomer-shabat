import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { closureModeLabel } from "../lib/closure-modes.js";
import { formatHebrewDateTime } from "../lib/hebcal-format.js";
import { getShabbatStatus } from "../lib/hebcal.server";
import { getShopSettings } from "../lib/shop-settings.server";
import {
  getThemeEmbedStatus,
  themeEditorAppsUrl,
} from "../lib/theme-embed.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);

  const [status, embed] = await Promise.all([
    getShabbatStatus({
      geonameId: settings.geonameId,
      includeHolidays: settings.includeHolidays,
    }),
    getThemeEmbedStatus(admin),
  ]);

  return {
    status,
    settings,
    embed,
    themeEditorUrl: themeEditorAppsUrl(session.shop),
  };
};

export default function Dashboard() {
  const { status, settings, embed, themeEditorUrl } = useLoaderData();

  const statusBadge = status.error ? (
    <s-badge tone="warning">לא זמין</s-badge>
  ) : status.isClosed ? (
    <s-badge tone="critical">סגור</s-badge>
  ) : (
    <s-badge tone="success">פתוח</s-badge>
  );

  const embedBadge = () => {
    switch (embed.state) {
      case "enabled":
        return <s-badge tone="success">מופעל</s-badge>;
      case "disabled":
        return <s-badge tone="warning">כבוי</s-badge>;
      case "not_found":
        return <s-badge tone="critical">לא מוגדר</s-badge>;
      default:
        return <s-badge tone="warning">לא ידוע</s-badge>;
    }
  };

  const embedMessage = () => {
    if (embed.error) {
      return embed.error;
    }
    const theme = embed.themeName ? ` (${embed.themeName})` : "";
    switch (embed.state) {
      case "enabled":
        return `תוסף שומר שבת פעיל בתבנית${theme}. החנות סגורה ב${closureModeLabel(settings.closureMode)}.`;
      case "disabled":
        return `שומר שבת מותקן בחנות אך כבוי בתבנית${theme}. יש להפעיל את התוסף בעורך התבנית.`;
      case "not_found":
        return `הטמעה לא הופעלה${theme}. יש להפעיל את האפליקציה תחת הטמעות אפליקציות.`;
      default:
        return "לא ניתן לבדוק את סטטוס ההטמעה.";
    }
  };

  const statusMessage = () => {
    if (status.error) {
      return `לא ניתן לטעון לוח זמנים מ-Hebcal: ${status.error}`;
    }
    if (status.isClosed) {
      const type = status.isHoliday ? "חג" : "שבת";
      const opens = formatHebrewDateTime(status.opensAt);
      return `החנות סגורה (${type}). פתיחה מתוכננת: ${opens ?? "-"}`;
    }
    return "החנות פתוחה.";
  };

  const skippedHolidayMessage = () => {
    const skipped = status.skippedHoliday;
    if (!skipped) return null;

    const closes = formatHebrewDateTime(skipped.closesAt);
    const opens = formatHebrewDateTime(skipped.opensAt);

    if (skipped.kind === "active") {
      return `כעת חג (${skipped.holidayTitle ?? "יום טוב"}) עד ${opens ?? "-"}. במצב שבת בלבד החנות פתוחה; תיסגר רק כשמתחילה שבת.`;
    }

    return `חג בלי שבת: ${closes} – ${opens ?? "-"}${skipped.holidayTitle ? ` (${skipped.holidayTitle})` : ""}. במצב שבת בלבד החנות נשארת פתוחה; תיסגר בכניסת שבת.`;
  };

  const nextClosureMessage = () => {
    if (status.error) {
      return "נסו לרענן את הדף בעוד כמה דקות.";
    }
    if (status.isClosed) {
      return null;
    }
    if (status.nextClosesAt) {
      const closes = formatHebrewDateTime(status.nextClosesAt);
      const opens = formatHebrewDateTime(status.nextOpensAt);
      const suffix = status.isHoliday || status.holidayTitle ? " (חג)" : "";
      const label = status.includeHolidays ? "סגירה הבאה" : "שבת הבאה";
      return `${label}: ${closes}${suffix}. פתיחה: ${opens ?? "-"}`;
    }
    return "אין סגירה מתוכננת בטווח הקרוב. בדקו הגדרות מיקום ולוח שנה.";
  };

  const holidaySkippedNotice = skippedHolidayMessage();

  return (
    <s-page heading="שומר שבת">
      <s-section heading="מצב פעולה בתבנית">
        <s-stack direction="block" gap="base">
          {embedBadge()}
          <s-paragraph>{embedMessage()}</s-paragraph>
          <s-link href={themeEditorUrl} target="_blank">
            <s-button variant={embed.state === "enabled" ? "primary" : undefined}>
              {embed.state === "enabled"
                ? "עריכת מסך שבת בעורך התבנית"
                : "פתיחת עורך התבנית"}
            </s-button>
          </s-link>
        </s-stack>
      </s-section>

      <s-section heading="סטטוס החנות">
        <s-stack direction="block" gap="base">
          {statusBadge}
          <s-paragraph>{statusMessage()}</s-paragraph>
          {!status.error && (
            <s-paragraph>מיקום: {settings.cityLabel}</s-paragraph>
          )}
          <s-paragraph>
            מצב סגירה: {closureModeLabel(settings.closureMode)}.{" "}
            <s-link href="/app/settings">שינוי בהגדרות</s-link>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="סגירה הבאה">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            {status.isClosed
              ? `החנות תיפתח ב-${formatHebrewDateTime(status.opensAt) ?? "-"}`
              : nextClosureMessage()}
          </s-paragraph>
          {holidaySkippedNotice && (
            <s-banner tone="warning">
              {holidaySkippedNotice}{" "}
              <s-link href="/app/settings">החלפה לשבת וחגים בהגדרות</s-link>
            </s-banner>
          )}
        </s-stack>
      </s-section>

      <s-section heading="התחלה">
        <s-unordered-list>
          <s-list-item>
            {embed.state === "enabled" ? (
              <>
                <s-link href={themeEditorUrl} target="_blank">
                  עיצוב דף השבת
                </s-link>
                {" "}
                - App embeds → Shomer Shabbat (טקסט, רקע, לוגו)
              </>
            ) : (
                <s-link href={themeEditorUrl} target="_blank">
                  הפעלת התוסף בעורך התבנית
                </s-link>
            )}
          </s-list-item>
          <s-list-item>
            <s-link href="/app/settings">הגדרות</s-link> - מיקום ושעון שבת
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="פעולות מהירות">
        <s-stack direction="block" gap="base">
          <s-link href={themeEditorUrl} target="_blank">
            <s-button variant="primary">
              {embed.state === "enabled"
                ? "עריכת עיצוב בתבנית"
                : "הפעלת התוסף בתבנית"}
            </s-button>
          </s-link>
          <s-link href="/app/settings">
            <s-button>פתיחת הגדרות</s-button>
          </s-link>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="אודות">
        <s-paragraph>
          שומר שבת סוגר את החנות המקוונת אוטומטית במהלך שבת וחגי ישראל, לפי
          זמני הדלקת נרות והבדלה מדויקים עבור המיקום שלכם.
        </s-paragraph>
        <s-paragraph>
          <s-text>זמנים: </s-text>
          <s-link href="https://www.hebcal.com" target="_blank">
            Hebcal
          </s-link>
          <s-text> (CC BY 4.0)</s-text>
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
