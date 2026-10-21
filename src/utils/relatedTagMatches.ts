// Resolve aliases before counting matching tags. Keep the original candidate
// label for the visible related-post reasons, but never double-count an alias.
export function getCommonCanonicalTags(
  sourceTags: readonly string[],
  candidateTags: readonly string[],
  resolveSlug: (tag: string) => string
): string[] {
  const sourceIds = new Set(sourceTags.map(resolveSlug).filter(Boolean));
  const seen = new Set<string>();

  return candidateTags.filter((tag) => {
    const id = resolveSlug(tag);
    if (!id || !sourceIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
