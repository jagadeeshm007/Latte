// Handing the browser a file to keep.

/** saveFile hands the browser a file to keep, from a URL or from text built on the page. */
export function saveFile(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
}

/** csvCell quotes a value for CSV, and defuses text a spreadsheet would run as a formula. */
export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** saveCsv builds a CSV file from rows and saves it. */
export function saveCsv(rows: (string | number | null)[][], filename: string) {
  const text = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  saveFile(url, filename);
  URL.revokeObjectURL(url);
}
