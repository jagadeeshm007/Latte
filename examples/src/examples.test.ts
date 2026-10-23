import { createHmac } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { LatteClient } from "@latte/sdk";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { latteFromEnv } from "./client.ts";
import * as crm from "./crm-sync.ts";
import { consoleCrm, syncScoredCalls, toActivity, type CrmActivity } from "./crm-sync.ts";
import * as transcripts from "./transcript-import.ts";
import { importExport, toTranscripts } from "./transcript-import.ts";
import * as upload from "./upload-and-wait.ts";
import { uploadFolder } from "./upload-and-wait.ts";
import * as receiver from "./webhook-receiver.ts";
import { createReceiver, describe as describeEvent, type LatteEvent } from "./webhook-receiver.ts";

// Each example's logic, run against a fake Latte (a fetch that answers like
// the API) or an in-process server. Nothing reaches a network.

type Route = (req: { method: string; url: URL; body: unknown }) => Response | undefined;

/** fakeLatte: a client whose fetch is answered by routes, recording every request. */
function fakeLatte(route: Route) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    calls.push({ method, path: url.pathname, body });
    const res = route({ method, url, body });
    if (!res) throw new Error(`unexpected ${method} ${url.pathname}`);
    return Promise.resolve(res);
  });
  const latte = new LatteClient({
    apiKey: "latte_test_key",
    baseUrl: "https://latte.test",
    fetch,
    sleep: () => Promise.resolve(),
  });
  return { latte, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const batch = (state: "processing" | "completed") => ({
  id: "b1",
  name: "Inbound",
  source: "api",
  createdBy: "u1",
  createdByName: "Manager",
  createdAt: "2026-10-22T10:00:00.000Z",
  archivedAt: null,
  total: 2,
  queued: state === "processing" ? 1 : 0,
  processing: 0,
  scored: state === "processing" ? 1 : 2,
  failed: 0,
  flagged: 1,
  avgScore: 80,
  state,
  breaches: 1,
  audioMs: 1000,
  costUsd: 0.01,
  lastActivityAt: null,
});

const IDS = { agentId: "a1", teamId: "t1", productId: "p1", callDate: "2026-10-22" };

describe("latteFromEnv", () => {
  it("says which variables are missing", () => {
    expect(() => latteFromEnv({})).toThrow("set LATTE_URL");
    expect(
      latteFromEnv({ LATTE_URL: "https://latte.test", LATTE_API_KEY: "latte_test_key" }),
    ).toBeInstanceOf(LatteClient);
  });
});

describe("upload-and-wait", () => {
  it("uploads the folder's recordings as one batch, waits, and returns the results CSV", async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "latte-calls-"));
    await writeFile(path.join(folder, "b.mp3"), "mp3");
    await writeFile(path.join(folder, "a.wav"), "wav");
    await writeFile(path.join(folder, "notes.txt"), "not a call");
    let polls = 0;
    const { latte, calls } = fakeLatte(({ method, url }) => {
      if (url.pathname === "/api/uploads/sign") {
        return json({
          uploads: ["a", "b"].map((n) => ({
            path: `p/${n}`,
            signedUrl: `https://storage.test/${n}`,
            token: "t",
          })),
        });
      }
      if (url.host === "storage.test" && method === "PUT")
        return new Response(null, { status: 200 });
      if (url.pathname === "/api/uploads/confirm")
        return json({ batchId: "b1", callIds: ["c1", "c2"] }, 201);
      if (url.pathname === "/api/batches/b1")
        return json(batch(polls++ === 0 ? "processing" : "completed"));
      if (url.pathname === "/api/batches/b1/results.csv")
        return new Response("call_id,score\nc1,80\n");
      return undefined;
    });

    const result = await uploadFolder(latte, folder, IDS, { name: "Inbound" });

    expect(result.csv).toBe("call_id,score\nc1,80\n");
    expect(result.batch.scored).toBe(2);
    expect(result.failed).toEqual([]);
    const confirm = calls.find((c) => c.path === "/api/uploads/confirm")?.body as {
      batchName: string;
      files: { originalFilename: string }[];
    };
    expect(confirm.batchName).toBe("Inbound");
    expect(confirm.files.map((f) => f.originalFilename)).toEqual(["a.wav", "b.mp3"]);
  });

  it("refuses a folder with no recordings", async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "latte-empty-"));
    const { latte } = fakeLatte(() => undefined);

    await expect(uploadFolder(latte, folder, IDS)).rejects.toThrow("no .wav or .mp3 files");
  });
});

describe("transcript-import", () => {
  const row = {
    id: "call-42",
    agentId: "a1",
    teamId: "t1",
    productId: "p1",
    date: "2026-10-22",
    transcript: "Agent: Hello.\nCustomer: Hi.",
  };

  it("maps an export row to a transcript upload, keeping the language when given", () => {
    expect(toTranscripts([row, { ...row, id: "call-43", language: "hi-IN" }])).toEqual([
      {
        originalFilename: "call-42.txt",
        agentId: "a1",
        teamId: "t1",
        productId: "p1",
        callDate: "2026-10-22",
        text: row.transcript,
      },
      {
        originalFilename: "call-43.txt",
        agentId: "a1",
        teamId: "t1",
        productId: "p1",
        callDate: "2026-10-22",
        language: "hi-IN",
        text: row.transcript,
      },
    ]);
  });

  it("names the first bad row and what it lacks", () => {
    expect(() => toTranscripts({})).toThrow("must be a JSON list");
    expect(() => toTranscripts([row, { ...row, agentId: "", transcript: 3 }])).toThrow(
      "call 2 has no agentId, transcript",
    );
    expect(() => toTranscripts([null])).toThrow("call 1 has no id");
  });

  it("sends the calls as one named batch", async () => {
    const { latte, calls } = fakeLatte(({ url }) =>
      url.pathname === "/api/uploads/transcripts"
        ? json({ batchId: "b9", callIds: ["c1"] }, 201)
        : undefined,
    );

    const result = await importExport(latte, [row], "Dialler");

    expect(result.batchId).toBe("b9");
    const sent = calls[0]?.body as {
      batchName: string;
      transcripts: { lines: { speaker: string }[] }[];
    };
    expect(sent.batchName).toBe("Dialler");
    expect(sent.transcripts[0]?.lines.map((l) => l.speaker)).toEqual(["agent", "customer"]);
  });
});

describe("webhook-receiver", () => {
  const secret = "whsec_example_test";
  const event: LatteEvent = {
    id: "e1",
    type: "call.scored",
    createdAt: "2026-10-22T10:00:00.000Z",
    data: { callId: "c1", overallScore: 72, needsReview: true, breaches: 1 },
  };
  const body = JSON.stringify(event);
  const sign = (b: string, t = Math.floor(Date.now() / 1000)) =>
    `t=${String(t)},v1=${createHmac("sha256", secret)
      .update(`${String(t)}.${b}`)
      .digest("hex")}`;

  function post(app: ReturnType<typeof createReceiver>, signature: string, delivery = "d1") {
    return request(app)
      .post("/latte-webhook")
      .set("Content-Type", "application/json")
      .set("Latte-Signature", signature)
      .set("Latte-Delivery", delivery)
      .send(body);
  }

  it("answers 204 and hands a signed event over once, however often it is delivered", async () => {
    const onEvent = vi.fn();
    const app = createReceiver({ secret, onEvent });

    await post(app, sign(body)).expect(204);
    await post(app, sign(body)).expect(204);

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it("refuses a wrong signature or an old one, and hands nothing over", async () => {
    const onEvent = vi.fn();
    const app = createReceiver({ secret, onEvent });

    await post(app, sign(`${body} `)).expect(400);
    await post(app, sign(body, Math.floor(Date.now() / 1000) - 600), "d2").expect(400);
    await post(app, "", "d3").expect(400);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("reports a failing handler without failing the delivery", async () => {
    const onError = vi.fn();
    const app = createReceiver({
      secret,
      onEvent: () => Promise.reject(new Error("CRM down")),
      onError,
    });

    await post(app, sign(body)).expect(204);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error("CRM down"), event);
    });
  });

  it("describes each event in one line", () => {
    const line = (type: string, data: Record<string, unknown>) =>
      describeEvent({ ...event, type, data });

    expect(describeEvent(event)).toBe("call c1 scored 72; needs QA review; 1 breaches");
    expect(
      line("call.scored", { callId: "c2", overallScore: 90, needsReview: false, breaches: 0 }),
    ).toContain("passed");
    expect(line("call.failed", { callId: "c1", reason: "mono" })).toBe("call c1 failed: mono");
    expect(line("batch.completed", { name: "B", scored: 2, failed: 1, total: 3 })).toBe(
      'batch "B" done: 2 scored, 1 failed of 3',
    );
    expect(
      line("alert.triggered", { ruleName: "Jump", groupName: "Inbound", value: 30, baseline: 10 }),
    ).toBe('alert "Jump" for Inbound: 30 against 10');
    expect(
      line("digest.ready", { frequency: "weekly", from: "2026-10-16", to: "2026-10-22" }),
    ).toBe("weekly digest for 2026-10-16 to 2026-10-22 is ready");
    expect(line("ping", {})).toBe("ping received");
  });
});

describe("crm-sync", () => {
  const call = (id: string) => ({
    id,
    originalFilename: `crm-${id}.wav`,
    callDate: "2026-10-22",
    agentName: "Ravi",
    overallScore: 81,
    needsReview: false,
    breaches: 0,
  });

  it("walks every page of scored calls with the cursor and upserts each by its own id", async () => {
    const { latte, calls } = fakeLatte(({ url }) => {
      if (url.pathname !== "/api/calls") return undefined;
      return url.searchParams.get("cursor")
        ? json({ items: [call("c3")], nextCursor: null, total: 3 })
        : json({ items: [call("c1"), call("c2")], nextCursor: "next", total: 3 });
    });
    const written: CrmActivity[] = [];

    const synced = await syncScoredCalls(latte, {
      upsertActivity: (a) => {
        written.push(a);
        return Promise.resolve();
      },
    });

    expect(synced).toBe(3);
    expect(written.map((a) => a.externalId)).toEqual(["crm-c1", "crm-c2", "crm-c3"]);
    expect(calls.map((c) => c.path)).toEqual(["/api/calls", "/api/calls"]);
  });

  it("maps a call to an activity, and the console CRM prints it", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const activity = toActivity(call("c1") as Parameters<typeof toActivity>[0]);

    await consoleCrm.upsertActivity(activity);

    expect(activity).toEqual({
      externalId: "crm-c1",
      latteCallId: "c1",
      callDate: "2026-10-22",
      agent: "Ravi",
      score: 81,
      needsReview: false,
      breaches: 0,
    });
    expect(write).toHaveBeenCalledWith("crm-c1: score 81, review false, breaches 0\n");
  });
});

describe("the command lines", () => {
  /** Keeps the examples' output out of the test log; returns the stdout spy. */
  const silence = () => {
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    return vi.spyOn(process.stdout, "write").mockReturnValue(true);
  };

  it("upload-and-wait saves the CSV where --out says and reports files it could not upload", async () => {
    silence();
    const folder = await mkdtemp(path.join(tmpdir(), "latte-cli-"));
    await writeFile(path.join(folder, "a.wav"), "wav");
    const out = path.join(folder, "out.csv");
    const { latte } = fakeLatte(({ method, url }) => {
      if (url.pathname === "/api/uploads/sign") {
        return json({
          uploads: [{ path: "p/a", signedUrl: "https://storage.test/a", token: "t" }],
        });
      }
      if (url.host === "storage.test" && method === "PUT")
        return new Response(null, { status: 200 });
      if (url.pathname === "/api/uploads/confirm")
        return json({ batchId: "b1", callIds: ["c1"] }, 201);
      if (url.pathname === "/api/batches/b1") return json(batch("completed"));
      if (url.pathname === "/api/batches/b1/results.csv") return new Response("call_id\nc1\n");
      return undefined;
    });
    const args = [
      folder,
      "--agent",
      "a1",
      "--team",
      "t1",
      "--product",
      "p1",
      "--date",
      "2026-10-22",
    ];

    await upload.main([...args, "--out", out, "--name", "CLI"], () => latte);

    expect(await readFile(out, "utf8")).toBe("call_id\nc1\n");
    await expect(upload.main([folder], () => latte)).rejects.toThrow("usage: upload-and-wait");
  });

  it("transcript-import reads the export file and prints the batch", async () => {
    const stdout = silence();
    const folder = await mkdtemp(path.join(tmpdir(), "latte-export-"));
    const file = path.join(folder, "export.json");
    await writeFile(
      file,
      JSON.stringify([
        {
          id: "x1",
          agentId: "a1",
          teamId: "t1",
          productId: "p1",
          date: "2026-10-22",
          transcript: "Agent: Hi.",
        },
      ]),
    );
    const { latte } = fakeLatte(({ url }) =>
      url.pathname === "/api/uploads/transcripts"
        ? json({ batchId: "b2", callIds: ["c1"] }, 201)
        : undefined,
    );

    await transcripts.main([file, "--name", "Export"], () => latte);

    expect(stdout).toHaveBeenCalledWith("batch b2: 1 calls queued for scoring\n");
    await expect(transcripts.main([], () => latte)).rejects.toThrow("usage: transcript-import");
  });

  it("crm-sync prints how many calls it synced", async () => {
    const stdout = silence();
    const { latte } = fakeLatte(({ url }) =>
      url.pathname === "/api/calls" ? json({ items: [], nextCursor: null, total: 0 }) : undefined,
    );

    await crm.main(() => latte, { upsertActivity: () => Promise.resolve() });

    expect(stdout).toHaveBeenCalledWith("0 calls synced\n");
  });

  it("webhook-receiver needs its secret and listens on PORT", async () => {
    silence();
    expect(() => receiver.main({})).toThrow("set LATTE_WEBHOOK_SECRET");

    const server = receiver.main({ LATTE_WEBHOOK_SECRET: "whsec_x", PORT: "0" });
    await new Promise((resolve) => server.once("listening", resolve));

    expect(server.listening).toBe(true);
    await new Promise((resolve) => server.close(resolve));
  });
});
