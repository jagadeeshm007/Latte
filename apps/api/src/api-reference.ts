import type { openApiDocument } from "./openapi.ts";

// The public API reference (docs/public/api-reference.md), written from the
// OpenAPI document so it cannot drift from the routes, schemas and webhooks
// the API actually has. `pnpm --filter @scc/api gen:docs` rewrites it, and
// `make typecheck` fails while the committed copy is out of date.

type Document = ReturnType<typeof openApiDocument>;

interface Schema {
  $ref?: string;
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  const?: unknown;
  items?: Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: Schema | boolean;
  description?: string;
  default?: unknown;
  maximum?: number;
  minimum?: number;
  maxLength?: number;
  maxItems?: number;
}

interface Parameter {
  name: string;
  in: string;
  required: boolean;
  description?: string;
  schema: Schema;
}

interface Operation {
  operationId: string;
  tags: string[];
  summary: string;
  description: string;
  parameters: Parameter[];
  requestBody?: { content: Record<string, { schema: Schema }> };
  responses: Record<string, { description: string; content?: Record<string, { schema: Schema }> }>;
}

const refName = (ref: string) => ref.slice(ref.lastIndexOf("/") + 1);
const anchor = (name: string) => `#${name.toLowerCase()}`;
/** A table cell: pipes escaped, newlines flattened. */
const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

/** typeOf: one schema as a short type, with named schemas linked. */
export function typeOf(schema: Schema): string {
  if (schema.$ref) return `[${refName(schema.$ref)}](${anchor(refName(schema.$ref))})`;
  if (schema.const !== undefined) return `\`${JSON.stringify(schema.const)}\``;
  if (schema.enum) return schema.enum.map((v) => `\`${JSON.stringify(v)}\``).join(" or ");
  const union = schema.anyOf ?? schema.oneOf;
  if (union) return union.map(typeOf).join(" or ");
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length === 0) return "any";
  return types
    .map((t) => {
      if (t === "array") return `array of ${schema.items ? typeOf(schema.items) : "any"}`;
      if (t === "string" && schema.format) return `string (${schema.format})`;
      if (t === "object" && !schema.properties) return "object";
      return t;
    })
    .join(" or ");
}

/** A bound worth printing: Zod's int() adds the safe-integer range, which says nothing. */
const bounded = (n: number | undefined): n is number =>
  n !== undefined && Math.abs(n) < Number.MAX_SAFE_INTEGER;

/** Limits and defaults worth knowing, as a short note. */
function notes(schema: Schema): string {
  const parts = [
    schema.description,
    schema.default !== undefined ? `default \`${JSON.stringify(schema.default)}\`` : undefined,
    bounded(schema.minimum) ? `at least ${String(schema.minimum)}` : undefined,
    bounded(schema.maximum) ? `at most ${String(schema.maximum)}` : undefined,
    schema.maxLength !== undefined ? `up to ${String(schema.maxLength)} characters` : undefined,
    schema.maxItems !== undefined ? `up to ${String(schema.maxItems)} items` : undefined,
  ];
  return cell(parts.filter(Boolean).join("; "));
}

function propertyTable(schema: Schema): string[] {
  const props = Object.entries(schema.properties ?? {});
  if (props.length === 0) return [`Type: ${typeOf(schema)}.`, ""];
  const required = new Set(schema.required ?? []);
  return [
    "| Field | Type | Required | Notes |",
    "| --- | --- | --- | --- |",
    ...props.map(
      ([name, s]) =>
        `| \`${name}\` | ${cell(typeOf(s))} | ${required.has(name) ? "yes" : "no"} | ${notes(s)} |`,
    ),
    "",
  ];
}

function operation(method: string, path: string, op: Operation): string[] {
  const lines = [
    `### ${op.operationId}`,
    "",
    `\`${method.toUpperCase()} ${path}\``,
    "",
    op.summary + ".",
  ];
  if (op.description) lines.push("", op.description);
  lines.push("");
  if (op.parameters.length > 0) {
    lines.push(
      "| Parameter | In | Type | Required | Notes |",
      "| --- | --- | --- | --- | --- |",
      ...op.parameters.map(
        (p) =>
          `| \`${p.name}\` | ${p.in} | ${cell(typeOf(p.schema))} | ${p.required ? "yes" : "no"} | ${notes(p.schema)} |`,
      ),
      "",
    );
  }
  const body = op.requestBody?.content["application/json"]?.schema;
  if (body) lines.push(`Request body: ${typeOf(body)}.`, "");
  for (const [status, response] of Object.entries(op.responses)) {
    if (status === "default") continue;
    const [type, content] = Object.entries(response.content ?? {})[0] ?? [];
    const what = !content
      ? "no body"
      : type === "application/json"
        ? typeOf(content.schema)
        : `a file (\`${type}\`)`;
    lines.push(`Response ${status}: ${what}.`, "");
  }
  return lines;
}

/** apiReference renders the whole document as one Markdown page. */
export function apiReference(doc: Document): string {
  const paths = doc.paths as Record<string, Record<string, Operation>>;
  const ops = Object.entries(paths).flatMap(([path, byMethod]) =>
    Object.entries(byMethod).map(([method, op]) => ({ method, path, op })),
  );
  const out = [
    "---",
    "title: API reference",
    "description: Every endpoint an API key can call, every schema and every webhook event, generated from the OpenAPI document.",
    "section: Reference",
    "order: 90",
    "---",
    "",
    "# API reference",
    "",
    `Version ${doc.info.version}. Generated from [openapi.json](/openapi.json); do not edit by hand.`,
    "",
    "Every request needs `Authorization: Bearer latte_...`. Errors answer the [Error](#error) shape; see [Errors](errors.md).",
    "",
  ];
  for (const tag of doc.tags) {
    const tagged = ops.filter(({ op }) => op.tags.includes(tag.name));
    if (tagged.length === 0) continue;
    out.push(`## ${tag.name}`, "", tag.description, "");
    for (const { method, path, op } of tagged) out.push(...operation(method, path, op));
  }
  out.push(
    "## Webhook events",
    "",
    "Each delivery is a POST of the event's envelope. See [Webhooks](webhooks.md) for signatures and retries.",
    "",
  );
  const hooks = doc.webhooks as Record<
    string,
    { post: { summary: string; requestBody: { content: Record<string, { schema: Schema }> } } }
  >;
  for (const [event, hook] of Object.entries(hooks)) {
    const envelope = hook.post.requestBody.content["application/json"]?.schema;
    out.push(
      `### ${event}`,
      "",
      hook.post.summary,
      "",
      `Body: ${envelope ? typeOf(envelope) : "any"}.`,
      "",
    );
  }
  out.push("## Schemas", "");
  const schemas = doc.components.schemas as Record<string, Schema>;
  for (const name of Object.keys(schemas).sort()) {
    const schema = schemas[name];
    if (!schema) continue;
    out.push(`### ${name}`, "");
    if (schema.description) out.push(schema.description, "");
    out.push(...propertyTable(schema));
  }
  return `${out.join("\n").trimEnd()}\n`;
}
