// Regenerates the Python, Go and Java SDKs in sdks/ from the API's OpenAPI
// document (sdks/README.md, ADR-0031). Nothing in them is written by hand
// except each language's webhook check and its test, which the generator is
// told to leave alone (.openapi-generator-ignore). Every SDK takes the
// version of packages/sdk, so one tag releases them all.
//
//   node scripts/gen-sdks.js            regenerate all three
//   node scripts/gen-sdks.js python     just one
//
// CI runs it and fails when the result differs from what is committed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/** The generator image, pinned: a new version can change every file, so upgrading is a commit of its own. */
const IMAGE = "openapitools/openapi-generator-cli:v7.26.0";
const LANGUAGES = ["python", "go", "java"];

const root = path.resolve(import.meta.dirname, "..");
const version = JSON.parse(
  readFileSync(path.join(root, "packages/sdk/package.json"), "utf8"),
).version;
const wanted = process.argv.slice(2);
const languages = wanted.length > 0 ? wanted : LANGUAGES;
for (const lang of languages) {
  if (!LANGUAGES.includes(lang))
    throw new Error(`unknown SDK "${lang}"; one of ${LANGUAGES.join(", ")}`);
}

// The document the API serves, less its webhooks section: clients receive no
// webhooks, and the event schemas they need stay in components.
const spec = JSON.parse(
  execFileSync("pnpm", ["--filter", "@scc/api", "--silent", "openapi"], {
    cwd: root,
    encoding: "utf8",
  }),
);
delete spec.webhooks;
mkdirSync(path.join(root, ".scratch/sdks"), { recursive: true });
writeFileSync(path.join(root, ".scratch/sdks/openapi.json"), JSON.stringify(spec, null, 2));

for (const lang of languages) {
  const out = path.join(root, "sdks", lang);
  // Remove what the last run generated, so a schema that went away leaves no file behind.
  const manifest = path.join(out, ".openapi-generator/FILES");
  if (existsSync(manifest)) {
    for (const file of readFileSync(manifest, "utf8").split("\n").filter(Boolean)) {
      const target = path.join(out, file);
      if (existsSync(target)) unlinkSync(target);
    }
  }
  const user = `${String(process.getuid?.() ?? 1000)}:${String(process.getgid?.() ?? 1000)}`;
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-u",
      user,
      "-v",
      `${root}:/w`,
      IMAGE,
      "generate",
      "-i",
      "/w/.scratch/sdks/openapi.json",
      "-c",
      `/w/sdks/config/${lang}.yaml`,
      "-o",
      `/w/sdks/${lang}`,
      "--additional-properties",
      `packageVersion=${version},artifactVersion=${version}`,
    ],
    { cwd: root, stdio: ["ignore", "ignore", "inherit"] },
  );
  process.stdout.write(`gen-sdks: ${lang} ${version}\n`);
}
