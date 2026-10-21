import type { CollectionEntry } from "astro:content";
import { getKoreaDateKey } from "./koreaDate";
import { buildPostActivityDateCounts } from "./postActivityCounts";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const BLOG_GRASS_WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export interface BlogGrassDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  isToday: boolean;
  isOutsideRange: boolean;
}

export interface BlogGrassWeek {
  days: BlogGrassDay[];
  monthLabel: string;
}

export interface BlogActivityStats {
  totalPosts: number;
  yearActivities: number;
  monthActivities: number;
  currentStreak: number;
  longestStreak: number;
  activityDateCounts: Record<string, number>;
  weeks: BlogGrassWeek[];
  rangeStart: string;
  rangeEnd: string;
}

export function buildBlogActivityStats(
  posts: CollectionEntry<"blog">[],
  today = new Date()
): BlogActivityStats {
  const todayUtc = parseDateKey(getKoreaDateKey(today));
  const currentYear = todayUtc.getUTCFullYear();
  const rangeStart = parseDateKey(`${currentYear}-01-01`);
  const graphStart = getMondayStart(rangeStart);
  const graphEnd = addUtcDays(getMondayStart(todayUtc), 6);
  const activityDateCounts = buildPostActivityDateCounts(posts.map((post) => post.data));
  const currentMonth = todayUtc.getUTCMonth();

  const weeks: BlogGrassWeek[] = [];

  for (let weekStart = graphStart; weekStart <= graphEnd; weekStart = addUtcDays(weekStart, 7)) {
    const days = BLOG_GRASS_WEEKDAY_LABELS.map((_, dayIndex) => {
      const date = addUtcDays(weekStart, dayIndex);
      const dateKey = toDateKey(date);
      const count = activityDateCounts[dateKey] ?? 0;
      const isOutsideRange = date < rangeStart || date > todayUtc;

      return {
        date: dateKey,
        count,
        level: isOutsideRange ? 0 : getActivityLevel(count),
        label: formatActivityLabel(date, count, isOutsideRange),
        isToday: dateKey === toDateKey(todayUtc),
        isOutsideRange
      };
    });

    weeks.push({
      days,
      monthLabel: getMonthLabel(days, weeks.length === 0)
    });
  }

  return {
    totalPosts: posts.filter((post) => !post.data.draft).length,
    yearActivities: sumCounts(
      activityDateCounts,
      (date) => date >= rangeStart && date <= todayUtc
    ),
    monthActivities: sumCounts(
      activityDateCounts,
      (date) =>
        date >= rangeStart &&
        date <= todayUtc &&
        date.getUTCMonth() === currentMonth
    ),
    currentStreak: calculateCurrentStreak(activityDateCounts, todayUtc),
    longestStreak: calculateLongestStreak(activityDateCounts, todayUtc),
    activityDateCounts,
    weeks,
    rangeStart: toDateKey(rangeStart),
    rangeEnd: toDateKey(todayUtc)
  };
}

function sumCounts(dateCounts: Record<string, number>, predicate: (date: Date) => boolean) {
  return Object.entries(dateCounts).reduce((total, [dateKey, count]) => {
    const date = parseDateKey(dateKey);

    return predicate(date) ? total + count : total;
  }, 0);
}

function calculateCurrentStreak(dateCounts: Record<string, number>, today: Date) {
  let streak = 0;

  for (let date = today; dateCounts[toDateKey(date)] > 0; date = addUtcDays(date, -1)) {
    streak += 1;
  }

  return streak;
}

function calculateLongestStreak(dateCounts: Record<string, number>, today: Date) {
  const activeDates = Object.keys(dateCounts)
    .filter((dateKey) => dateCounts[dateKey] > 0 && parseDateKey(dateKey) <= today)
    .sort();

  if (activeDates.length === 0) {
    return 0;
  }

  let longest = 0;
  let current = 0;
  let previous: Date | undefined;

  for (const dateKey of activeDates) {
    const date = parseDateKey(dateKey);
    current = previous && date.valueOf() - previous.valueOf() === DAY_IN_MS ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
}

function getActivityLevel(count: number): BlogGrassDay["level"] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;

  return 4;
}

function getMonthLabel(days: BlogGrassDay[], isFirstWeek: boolean) {
  const firstVisibleDay = days.find((day) => !day.isOutsideRange);

  if (!firstVisibleDay) {
    return "";
  }

  const labelDay = isFirstWeek
    ? firstVisibleDay
    : days.find((day) => !day.isOutsideRange && parseDateKey(day.date).getUTCDate() === 1);

  if (!labelDay) {
    return "";
  }

  const date = parseDateKey(labelDay.date);

  return `${date.getUTCMonth() + 1}월`;
}

function formatActivityLabel(date: Date, count: number, isOutsideRange: boolean) {
  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);

  if (isOutsideRange) {
    return `${dateLabel}: 표시 범위 밖`;
  }

  return `${dateLabel}: 공개 글의 최종 작성·수정일 ${count}건`;
}

function getMondayStart(date: Date) {
  const day = date.getUTCDay();
  const mondayOffset = (day + 6) % 7;

  return addUtcDays(date, -mondayOffset);
}

function startOfUtcDay(dateInput: Date | string | number) {
  const date = normalizeDate(dateInput);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.valueOf() + days * DAY_IN_MS);
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function toDateKey(date: Date | string | number) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function normalizeDate(dateInput: Date | string | number) {
  if (dateInput instanceof Date) {
    return dateInput;
  }

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnly) {
      const [, year, month, day] = dateOnly;

      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    return new Date(trimmed);
  }

  return new Date(dateInput);
}
