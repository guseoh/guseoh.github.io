export const KOREA_TIME_ZONE = "Asia/Seoul";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const KOREA_OFFSET_IN_MS = 9 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getKoreaDateKey(dateInput = new Date()) {
  const date = normalizeDate(dateInput);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function addDateKeyDays(dateKey, days) {
  const date = parseDateKey(dateKey);

  return new Date(date.valueOf() + days * DAY_IN_MS).toISOString().slice(0, 10);
}

export function getKoreaDayUtcRange(dateKey) {
  const date = parseDateKey(dateKey);
  const start = new Date(date.valueOf() - KOREA_OFFSET_IN_MS);
  const end = new Date(start.valueOf() + DAY_IN_MS - 1);

  return { start, end };
}

function parseDateKey(dateKey) {
  const match = dateKey.match(DATE_KEY_PATTERN);

  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const [, year, month, day] = match;

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.toISOString().slice(0, 10) !== dateKey) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return date;
}

function normalizeDate(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid date input: ${dateInput}`);
  }

  return date;
}
