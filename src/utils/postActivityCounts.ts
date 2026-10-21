// A published post contributes exactly once, on its latest creation/edit
// date. Frontmatter dates are calendar dates encoded as UTC midnight by Astro;
// do not re-interpret them using the build runner's timezone.
export interface PostActivityEntry {
  date: Date;
  updated?: Date;
  lastVerified?: Date;
  draft: boolean;
}

export function buildPostActivityDateCounts(entries: readonly PostActivityEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const { draft, date, updated } of entries) {
    if (draft) continue;
    // Verification is not an edit and must not manufacture an activity event.
    const key = (updated ?? date).toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}
