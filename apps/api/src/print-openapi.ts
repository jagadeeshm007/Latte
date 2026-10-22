// Prints the OpenAPI document /api/openapi.json serves, for tools that
// generate from it without a running API (sdks/generate.sh).
import process from "node:process";

import { openApiDocument } from "./openapi.ts";

process.stdout.write(`${JSON.stringify(openApiDocument(), null, 2)}\n`);
