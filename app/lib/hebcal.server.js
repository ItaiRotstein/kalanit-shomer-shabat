import { formatHebrewDateTime } from "./hebcal-format.js";

export { formatHebrewDateTime };

/** Default: Tel Aviv — replaced by merchant location from settings later */
export const DEFAULT_GEONAME_ID = 293397;

const ISRAEL_TZ = "Asia/Jerusalem";

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

function cacheKey(geonameId, year) {
  return `${geonameId}:${year}`;
}

function buildHebcalUrl(geonameId, year) {
  const params = new URLSearchParams({
    v: "1",
    cfg: "json",
    maj: "on",
    min: "off",
    mod: "off",
    nx: "off",
    year: String(year),
    month: "x",
    ss: "off",
    mf: "off",
    c: "on",
    geonameid: String(geonameId),
    M: "on",
    s: "off",
    i: "on",
    lg: "he",
  });
  return `https://www.hebcal.com/hebcal?${params}`;
}

async function fetchCalendarItems(geonameId, year) {
  const key = cacheKey(geonameId, year);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const response = await fetch(buildHebcalUrl(geonameId, year));
  if (!response.ok) {
    throw new Error(`Hebcal API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(key, { fetchedAt: Date.now(), data });
  return data;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Closure windows and "next closure" lookahead can cross Dec 31. */
const LOOKAHEAD_DAYS = 45;
const LOOKBEHIND_DAYS = 7;

function yearsToFetch(now) {
  const year = now.getFullYear();
  const years = [];

  if (now.getTime() - new Date(year, 0, 1).getTime() < LOOKBEHIND_DAYS * DAY_MS) {
    years.push(year - 1);
  }

  years.push(year);

  if (new Date(year + 1, 0, 1).getTime() - now.getTime() < LOOKAHEAD_DAYS * DAY_MS) {
    years.push(year + 1);
  }

  return years;
}

/**
 * Adjacent years are best-effort so a failure there can't break the current year.
 */
async function fetchCalendarRange(geonameId, now) {
  const years = yearsToFetch(now);
  const currentYear = now.getFullYear();

  const results = await Promise.all(
    years.map((year) =>
      year === currentYear
        ? fetchCalendarItems(geonameId, year)
        : fetchCalendarItems(geonameId, year).catch(() => null),
    ),
  );

  const items = results.flatMap((data) => data?.items ?? []);
  const locationTitle =
    results.find((data) => data?.location?.title)?.location?.title ?? null;

  return { items, locationTitle };
}

function isErevYomTov(item) {
  const t = `${item.title || ""} ${item.hebrew || ""}`;
  return /Erev/i.test(t);
}

function getIsraelWeekday(date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ISRAEL_TZ,
    weekday: "short",
  }).format(date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? date.getDay();
}

function blockIncludesShabbat(closesAt, opensAt) {
  const d = new Date(closesAt);
  d.setHours(12, 0, 0, 0);
  const end = new Date(opensAt);
  end.setHours(12, 0, 0, 0);
  while (d.getTime() <= end.getTime()) {
    if (getIsraelWeekday(d) === 6) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
}

/**
 * In a chag+Shabbat block, Shabbat starts at Friday candle lighting (Israel).
 */
function findShabbatCandleLighting(window, items) {
  const opensAt = window.opensAt.getTime();
  const candleTimes = [];

  for (const item of items) {
    if (item.category !== "candles") continue;
    const at = new Date(item.date);
    const ts = at.getTime();
    if (ts >= window.closesAt.getTime() && ts < opensAt) {
      candleTimes.push(at);
    }
  }

  if (candleTimes.length === 0) return null;

  let fridayCandles = null;
  for (const at of candleTimes) {
    if (getIsraelWeekday(at) === 5) fridayCandles = at;
  }
  if (fridayCandles) return fridayCandles;

  if (!window.isHoliday) return candleTimes[0];

  for (let i = candleTimes.length - 1; i >= 0; i--) {
    if (blockIncludesShabbat(candleTimes[i], window.opensAt)) {
      return candleTimes[i];
    }
  }

  return null;
}

/**
 * שבת בלבד: every Shabbat closes; chag days without Shabbat stay open.
 * שבת וחגים: full chag + Shabbat blocks.
 */
function filterWindowsForMode(allWindows, includeHolidays, items) {
  if (includeHolidays) return allWindows;

  const shabbatWindows = [];

  for (const window of allWindows) {
    if (!blockIncludesShabbat(window.closesAt, window.opensAt)) continue;

    if (!window.isHoliday) {
      shabbatWindows.push({ ...window, isHoliday: false, holidayTitle: null });
      continue;
    }

    const shabbatStart = findShabbatCandleLighting(window, items);
    if (!shabbatStart) continue;

    shabbatWindows.push({
      ...window,
      closesAt: shabbatStart,
      isHoliday: false,
      holidayTitle: null,
    });
  }

  return shabbatWindows;
}

/**
 * Build closure windows from Hebcal items (candles / holiday / havdalah).
 * Pairs first candle lighting in a block with the matching havdalah.
 */
export function collectClosureWindows(items) {
  const windows = [];
  let blockCandlesAt = null;
  let blockHasYomTov = false;
  let blockHasErevYomTov = false;
  let holidayTitle = null;

  for (const item of items) {
    const cat = item.category;
    if (cat === "holiday") {
      if (item.yomtov) blockHasYomTov = true;
      if (isErevYomTov(item)) blockHasErevYomTov = true;
      holidayTitle = item.hebrew || item.title;
    } else if (cat === "candles") {
      if (blockCandlesAt === null) {
        blockCandlesAt = new Date(item.date);
      }
    } else if (cat === "havdalah" && blockCandlesAt !== null) {
      const opensAt = new Date(item.date);
      const shouldClose =
        blockHasYomTov ||
        blockHasErevYomTov ||
        blockIncludesShabbat(blockCandlesAt, opensAt);

      if (shouldClose) {
        const isHoliday = blockHasYomTov || blockHasErevYomTov;
        windows.push({
          closesAt: blockCandlesAt,
          opensAt,
          isHoliday,
          holidayTitle: isHoliday ? holidayTitle : null,
          label: item.memo || null,
        });
      }

      blockCandlesAt = null;
      blockHasYomTov = false;
      blockHasErevYomTov = false;
      holidayTitle = null;
    }
  }

  return windows;
}

function findCurrentWindow(windows, now) {
  const ts = now.getTime();
  for (const w of windows) {
    if (ts >= w.closesAt.getTime() && ts <= w.opensAt.getTime()) {
      return w;
    }
  }
  return null;
}

function findNextWindow(windows, now) {
  const ts = now.getTime();
  for (const w of windows) {
    if (w.closesAt.getTime() > ts) {
      return w;
    }
  }
  return null;
}

function buildStatusFromWindows(windows, now, includeHolidays) {
  const current = findCurrentWindow(windows, now);
  const next = current ? null : findNextWindow(windows, now);

  return {
    isClosed: Boolean(current),
    isHoliday: current?.isHoliday ?? next?.isHoliday ?? false,
    includeHolidays,
    closesAt: current?.closesAt?.toISOString() ?? next?.closesAt?.toISOString() ?? null,
    opensAt: current?.opensAt?.toISOString() ?? null,
    nextClosesAt: next?.closesAt?.toISOString() ?? null,
    nextOpensAt: next?.opensAt?.toISOString() ?? null,
    holidayTitle: current?.holidayTitle ?? next?.holidayTitle ?? null,
  };
}

/**
 * Chag-only slice skipped in שבת בלבד (e.g. erev Shavuot before Shabbat starts).
 */
function findSkippedHolidayNotice(allWindows, shabbatOnlyWindows, items, now) {
  const ts = now.getTime();

  for (const holidayWindow of allWindows) {
    if (!holidayWindow.isHoliday) continue;

    const shabbatStart = findShabbatCandleLighting(holidayWindow, items);
    if (!shabbatStart) continue;

    const chagOnlyEnd = shabbatStart.getTime();
    const chagStart = holidayWindow.closesAt.getTime();
    const chagEnd = holidayWindow.opensAt.getTime();

    if (chagOnlyEnd <= chagStart) continue;

    if (ts >= chagStart && ts < chagOnlyEnd) {
      return {
        kind: "active",
        closesAt: holidayWindow.closesAt.toISOString(),
        opensAt: shabbatStart.toISOString(),
        holidayTitle: holidayWindow.holidayTitle,
      };
    }

    if (chagStart > ts && chagStart < chagEnd) {
      const nextShabbat = findNextWindow(shabbatOnlyWindows, now);
      const nextShabbatClose = nextShabbat
        ? nextShabbat.closesAt.getTime()
        : Number.POSITIVE_INFINITY;

      if (chagStart < nextShabbatClose) {
        return {
          kind: "upcoming",
          closesAt: holidayWindow.closesAt.toISOString(),
          opensAt: shabbatStart.toISOString(),
          holidayTitle: holidayWindow.holidayTitle,
        };
      }
    }
  }

  return null;
}

/**
 * @param {{ geonameId?: number, now?: Date, includeHolidays?: boolean }} options
 */
export async function getShabbatStatus(options = {}) {
  const geonameId = options.geonameId ?? DEFAULT_GEONAME_ID;
  const includeHolidays = options.includeHolidays !== false;
  const now = options.now ?? new Date();

  try {
    const { items, locationTitle } = await fetchCalendarRange(geonameId, now);
    const allWindows = collectClosureWindows(items);
    const windows = filterWindowsForMode(allWindows, includeHolidays, items);
    const status = buildStatusFromWindows(windows, now, includeHolidays);
    const skippedHoliday = includeHolidays
      ? null
      : findSkippedHolidayNotice(
          allWindows,
          filterWindowsForMode(allWindows, false, items),
          items,
          now,
        );

    return {
      ok: true,
      ...status,
      skippedHoliday,
      locationTitle,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      isClosed: false,
      isHoliday: false,
      includeHolidays,
      closesAt: null,
      opensAt: null,
      nextClosesAt: null,
      nextOpensAt: null,
      locationTitle: null,
      holidayTitle: null,
      skippedHoliday: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
