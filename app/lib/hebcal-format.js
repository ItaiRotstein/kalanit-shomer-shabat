const ISRAEL_TZ = "Asia/Jerusalem";

const hebrewDateTime = new Intl.DateTimeFormat("he-IL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ISRAEL_TZ,
});

export function formatHebrewDateTime(isoString) {
  if (!isoString) return null;
  return hebrewDateTime.format(new Date(isoString));
}
