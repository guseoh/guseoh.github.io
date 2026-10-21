/**
 * Escape HTML-sensitive characters when embedding JSON into script elements.
 * JSON.parse restores the original value; a raw </script> would end the tag.
 */
export function serializeInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
