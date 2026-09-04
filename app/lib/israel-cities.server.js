import { DEFAULT_GEONAME_ID } from "./hebcal.server";

/** Hebcal geoname.org IDs — verified against Hebcal location API */
export const ISRAEL_CITIES = [
  { geonameId: 293397, label: "תל אביב" },
  { geonameId: 281184, label: "ירושלים" },
  { geonameId: 294801, label: "חיפה" },
  { geonameId: 295530, label: "באר שבע" },
  { geonameId: 293703, label: "ראשון לציון" },
  { geonameId: 295629, label: "אשדוד" },
  { geonameId: 294071, label: "נתניה" },
  { geonameId: 295514, label: "בני ברק" },
  { geonameId: 294751, label: "חולון" },
  { geonameId: 293788, label: "רמת גן" },
  { geonameId: 293725, label: "רחובות" },
  { geonameId: 294778, label: "הרצליה" },
  { geonameId: 295277, label: "אילת" },
  { geonameId: 293322, label: "טבריה" },
  { geonameId: 282926, label: "מודיעין" },
];

const cityById = new Map(
  ISRAEL_CITIES.map((city) => [city.geonameId, city.label]),
);

export function isValidGeonameId(geonameId) {
  return cityById.has(Number(geonameId));
}

export function getCityLabel(geonameId) {
  return cityById.get(Number(geonameId)) ?? cityById.get(DEFAULT_GEONAME_ID);
}
