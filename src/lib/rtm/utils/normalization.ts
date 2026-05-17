/**
 * Normalizes a key by trimming, uppercasing, and removing all internal whitespace.
 * Example: " us -  101 " -> "US-101"
 */
export function normalizeKey(key: string): string {
  if (!key) return "";
  return key
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ""); // Remove all whitespace, including internal spaces
}

/**
 * Returns a deduplicated array of strings.
 */
export function deduplicate(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
