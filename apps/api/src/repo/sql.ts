// Small SQL helpers shared by the repositories.

/** likePattern makes user text a literal ILIKE pattern: % and _ match themselves. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}
