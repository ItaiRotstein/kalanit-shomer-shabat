import prisma from "../db.server";
import { DEFAULT_GEONAME_ID } from "./hebcal.server";
import { getCityLabel, isValidGeonameId } from "./israel-cities.server";
import {
  CLOSURE_MODES,
  DEFAULT_CLOSURE_MODE,
  closureModeLabel,
  includesHolidays,
} from "./closure-modes.js";

export { CLOSURE_MODES, closureModeLabel, includesHolidays };

/**
 * @param {string} shop
 */
export async function getShopSettings(shop) {
  const row = await prisma.shopSettings.findUnique({ where: { shop } });

  return {
    shop,
    closureMode: row?.closureMode ?? DEFAULT_CLOSURE_MODE,
    geonameId: row?.geonameId ?? DEFAULT_GEONAME_ID,
    cityLabel: getCityLabel(row?.geonameId ?? DEFAULT_GEONAME_ID),
    includeHolidays: includesHolidays(row?.closureMode ?? DEFAULT_CLOSURE_MODE),
  };
}

/**
 * @param {string} shop
 * @param {{ closureMode?: string, geonameId?: number }} data
 */
export async function saveShopSettings(shop, data) {
  const closureMode = data.closureMode ?? DEFAULT_CLOSURE_MODE;
  const geonameId = data.geonameId ?? DEFAULT_GEONAME_ID;

  if (
    closureMode !== CLOSURE_MODES.SHABBAT_ONLY &&
    closureMode !== CLOSURE_MODES.SHABBAT_AND_HOLIDAYS
  ) {
    throw new Error("Invalid closure mode");
  }

  if (!isValidGeonameId(geonameId)) {
    throw new Error("Invalid city");
  }

  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, closureMode, geonameId },
    update: { closureMode, geonameId },
  });
}
