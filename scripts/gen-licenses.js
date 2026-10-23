// Writes docs/public/legal/licenses.md: every package the running app and API
// depend on, with its version and licence, from `pnpm licenses list --prod`
// (built into pnpm, so no extra tool). With --check it changes nothing and
// fails when the page no longer matches the lockfile; make typecheck runs it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, "docs/public/legal/licenses.md");

/** pnpm groups packages by licence; flatten to one row per package and version. */
const byLicence = JSON.parse(
  execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
);
const rows = Object.entries(byLicence)
  .flatMap(([licence, packages]) =>
    packages.flatMap((p) =>
      p.versions.map((version) => ({ name: p.name, version, licence, homepage: p.homepage ?? "" })),
    ),
  )
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

const cell = (text) => text.replaceAll("|", "\\|");
const licenceText = (licence) => (licence === "Unknown" ? "not stated by the package" : licence);
const counts = Object.entries(
  rows.reduce(
    (acc, r) => ({ ...acc, [licenceText(r.licence)]: (acc[licenceText(r.licence)] ?? 0) + 1 }),
    {},
  ),
).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const page = `---
title: Open-source licences
description: Latte's own licence, and every open-source package the app and API run on, with its licence.
section: Legal
order: 5
---

# Open-source licences

Latte is open source under the [MIT licence](https://github.com/jagadeeshm007/Latte/blob/main/LICENSE), copyright 2026 Jagadeesh Mandala.

It runs on the open-source packages below, ${String(rows.length)} in all. Each is used under its own licence, whose full text ships with the package and is at its homepage. Generated from \`pnpm licenses list --prod\` by \`scripts/gen-licenses.js\`; do not edit by hand.

| Licence | Packages |
| --- | --- |
${counts.map(([licence, n]) => `| ${cell(licence)} | ${String(n)} |`).join("\n")}

| Package | Version | Licence |
| --- | --- | --- |
${rows
  .map((r) => {
    const name = r.homepage ? `[${cell(r.name)}](${r.homepage})` : cell(r.name);
    return `| ${name} | ${cell(r.version)} | ${cell(licenceText(r.licence))} |`;
  })
  .join("\n")}
`;

if (process.argv.includes("--check")) {
  if (!existsSync(target) || readFileSync(target, "utf8") !== page) {
    process.stderr.write("docs/public/legal/licenses.md is out of date: run make licenses\n");
    process.exit(1);
  }
  process.stdout.write(`gen-licenses: licenses.md is current (${String(rows.length)} packages)\n`);
} else {
  writeFileSync(target, page);
  process.stdout.write(`gen-licenses: wrote licenses.md (${String(rows.length)} packages)\n`);
}
