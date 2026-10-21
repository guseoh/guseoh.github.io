// Share first-page, later-page and empty-archive boundaries.
export function getPageCount(totalItems: number, pageSize: number): number {
  if (!Number.isSafeInteger(totalItems) || totalItems < 0 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError("Invalid pagination item count or page size");
  }
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function getPageItems<T>(items: readonly T[], page: number, pageSize: number): T[] {
  if (!Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError("Invalid pagination page or page size");
  }
  return items.slice((page - 1) * pageSize, page * pageSize);
}

export function getPageHref(basePath: string, page: number): string {
  if (!Number.isSafeInteger(page) || page < 1) throw new RangeError("Invalid pagination page");
  const base = basePath.replace(/\/+$/, "");
  return page === 1 ? `${base}/` : `${base}/page/${page}/`;
}
