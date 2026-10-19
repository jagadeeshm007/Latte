import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createStorage } from "./storage.ts";

// SCC-1: Storage answers a HEAD for a missing object with 400 or 404, and
// supabase-js reports that as { data: false, error }. exists() threw on the
// error, so upload confirm answered 500 and the status page showed storage down.

let server: Server;
let url: string;
beforeAll(async () => {
  server = createServer((req, res) => {
    const missing = req.url?.endsWith("/missing.wav");
    res.writeHead(missing ? 400 : req.url?.endsWith("/broken.wav") ? 500 : 200).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
});
afterAll(() => {
  server.close();
});

const storage = () =>
  createStorage({
    SUPABASE_URL: url,
    SUPABASE_SECRET_KEY: "service-key-for-tests",
    RECORDINGS_BUCKET: "recordings",
  });

describe("storage.exists", () => {
  it("answers false for an object that is not there", async () => {
    expect(await storage().exists("u/missing.wav")).toBe(false);
  });

  it("answers true for an object that is there", async () => {
    expect(await storage().exists("u/present.wav")).toBe(true);
  });

  it("still fails when storage itself errors", async () => {
    await expect(storage().exists("u/broken.wav")).rejects.toThrow();
  });
});
