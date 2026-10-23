/** headingId: the anchor a heading gets, the one `[x](page.md#anchor)` links use. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}
