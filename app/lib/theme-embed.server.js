/** Matches shopify://apps/.../blocks/shabbat-embed/... in settings_data.json */
const EMBED_BLOCK_MATCH = /shomer-shabbat\/blocks\/shabbat-embed/i;

const THEMES_QUERY = `#graphql
  query ShomerShabbatThemeEmbed {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
        name
        files(filenames: ["config/settings_data.json"]) {
          nodes {
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  }
`;

function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function parseSettingsData(content) {
  if (!content) return null;
  try {
    return JSON.parse(stripJsonComments(content));
  } catch {
    return null;
  }
}

function findEmbedBlock(settings) {
  const blocks = settings?.current?.blocks;
  if (!blocks || typeof blocks !== "object") return null;

  for (const block of Object.values(blocks)) {
    if (block?.type && EMBED_BLOCK_MATCH.test(block.type)) {
      return block;
    }
  }
  return null;
}

/**
 * @param {object} admin - Shopify Admin API client from authenticate.admin()
 * @returns {Promise<{
 *   state: "enabled" | "disabled" | "not_found" | "unknown",
 *   themeName: string | null,
 *   themeId: string | null,
 *   error: string | null,
 * }>}
 */
export async function getThemeEmbedStatus(admin) {
  try {
    const response = await admin.graphql(THEMES_QUERY);
    const { data, errors } = await response.json();

    if (errors?.length) {
      const message = errors.map((e) => e.message).join("; ");
      const needsScope = /access|scope|denied/i.test(message);
      return {
        state: "unknown",
        themeName: null,
        themeId: null,
        error: needsScope
          ? "חסרה הרשאת read_themes — יש לאשר הרשאות מחדש באפליקציה"
          : message,
      };
    }

    const theme = data?.themes?.nodes?.[0];
    if (!theme) {
      return {
        state: "unknown",
        themeName: null,
        themeId: null,
        error: "לא נמצאה ערכת עיצוב ראשית",
      };
    }

    const content = theme.files?.nodes?.[0]?.body?.content;
    const settings = parseSettingsData(content);

    if (!settings) {
      return {
        state: "unknown",
        themeName: theme.name,
        themeId: theme.id,
        error: "לא ניתן לקרוא את הגדרות הערכה",
      };
    }

    const block = findEmbedBlock(settings);
    if (!block) {
      return {
        state: "not_found",
        themeName: theme.name,
        themeId: theme.id,
        error: null,
      };
    }

    if (block.disabled === true) {
      return {
        state: "disabled",
        themeName: theme.name,
        themeId: theme.id,
        error: null,
      };
    }

    return {
      state: "enabled",
      themeName: theme.name,
      themeId: theme.id,
      error: null,
    };
  } catch (err) {
    return {
      state: "unknown",
      themeName: null,
      themeId: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * @param {string} shop - e.g. my-store.myshopify.com
 */
export function themeEditorAppsUrl(shop) {
  const handle = shop.replace(/\.myshopify\.com$/i, "");
  return `https://admin.shopify.com/store/${handle}/themes/current/editor?context=apps`;
}
