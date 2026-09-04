export const CLOSURE_MODES = {
  SHABBAT_ONLY: "shabbat_only",
  SHABBAT_AND_HOLIDAYS: "shabbat_and_holidays",
};

export const DEFAULT_CLOSURE_MODE = CLOSURE_MODES.SHABBAT_AND_HOLIDAYS;

export function includesHolidays(closureMode) {
  return closureMode === CLOSURE_MODES.SHABBAT_AND_HOLIDAYS;
}

export function closureModeLabel(closureMode) {
  return closureMode === CLOSURE_MODES.SHABBAT_ONLY
    ? "שבת בלבד"
    : "שבת וחגים";
}
