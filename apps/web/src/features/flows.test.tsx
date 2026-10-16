import { DEFAULT_RUBRIC } from "@scc/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { detail } from "@/test/fixtures";
import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { CallDetailPage } from "./calls/CallDetailPage";
import { UploadForm, UploadPage } from "./calls/UploadPage";
import { ScorecardPage } from "./coaching/ScorecardPage";
import { RubricPage } from "./manager/RubricPage";
import { AddFindingDialog } from "./review/AddFindingDialog";

// Multi-step flows: upload end to end, completing a review, adding a missed
// finding, retrying a failed call, and the rubric page per role.

const me = (role: "qa_reviewer" | "manager") => ({
  id: "u1",
  email: "u@test",
  displayName: "Test User",
  role,
  agentId: null,
});
const reference = {
  agents: [{ id: "a1", name: "Ravi Kumar", teamId: "t1", externalCode: "AG001" }],
  teams: [{ id: "t1", name: "Mumbai Inbound" }],
  products: [{ id: "p1", name: "ULIP" }],
};

/** A stand-in for the browser's XMLHttpRequest that uploads instantly. */
class FakeXhr {
  static sent: { url: string; type: string | null }[] = [];
  static status = 200;
  upload: {
    onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null;
  } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  private url = "";
  private type: string | null = null;
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader(_name: string, value: string) {
    this.type = value;
  }
  send() {
    FakeXhr.sent.push({ url: this.url, type: this.type });
    this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    this.status = FakeXhr.status;
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

beforeEach(() => {
  FakeXhr.sent = [];
  FakeXhr.status = 200;
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  server.use(http.get("*/api/me", () => HttpResponse.json(me("qa_reviewer"))));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function choose(label: string, option: string) {
  await userEvent.click(await screen.findByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("upload flow (US-01-001)", () => {
  it("signs, uploads straight to storage with the WAV type, then confirms with the metadata", async () => {
    const confirmed: unknown[] = [];
    const confirm = vi.fn(async ({ request }: { request: Request }) => {
      const body = (await request.json()) as {
        files: { agentId: string; teamId: string; productId: string; path: string }[];
      };
      confirmed.push(...body.files);
      return HttpResponse.json(
        { batchId: "b1", callIds: body.files.map((_, i) => `c${String(i)}`) },
        { status: 201 },
      );
    });
    server.use(
      http.post("*/api/uploads/sign", () =>
        HttpResponse.json({
          uploads: [{ path: "u1/x.wav", signedUrl: "https://storage.test/up/x", token: "t" }],
        }),
      ),
      http.post("*/api/uploads/confirm", confirm),
    );
    await renderInRouter(<UploadForm reference={reference} />);

    await userEvent.upload(screen.getByLabelText("Choose recordings"), [
      new File([new Uint8Array(10)], "call.WAV", { type: "audio/x-wav" }),
    ]);
    await choose("Agent for call.WAV", "Ravi Kumar (AG001)");
    await choose("Product for call.WAV", "ULIP");
    await choose("Language of call.WAV", "Tamil");
    await userEvent.click(screen.getByRole("button", { name: /Upload 1 file/ }));

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledTimes(1);
    });
    expect(FakeXhr.sent).toEqual([{ url: "https://storage.test/up/x", type: "audio/wav" }]);
    expect(confirmed[0]).toMatchObject({
      agentId: "a1",
      teamId: "t1",
      productId: "p1",
      path: "u1/x.wav",
      mimeType: "audio/wav",
      language: "ta-IN",
    });
  });

  it("names the batch and sets the agent and product for every file at once", async () => {
    const bodies: { batchName?: string; files: { agentId: string; productId: string }[] }[] = [];
    server.use(
      http.post("*/api/uploads/sign", async ({ request }) => {
        const body = (await request.json()) as { files: unknown[] };
        return HttpResponse.json({
          uploads: body.files.map((_, i) => ({
            path: `u1/${String(i)}.wav`,
            signedUrl: `https://storage.test/up/${String(i)}`,
            token: "t",
          })),
        });
      }),
      http.post("*/api/uploads/confirm", async ({ request }) => {
        const body = (await request.json()) as (typeof bodies)[number];
        bodies.push(body);
        return HttpResponse.json(
          { batchId: "b9", callIds: body.files.map((_, i) => `c${String(i)}`) },
          { status: 201 },
        );
      }),
    );
    await renderInRouter(<UploadForm reference={reference} />);

    await userEvent.upload(screen.getByLabelText("Choose recordings"), [
      new File([new Uint8Array(10)], "one.wav"),
      new File([new Uint8Array(10)], "two.wav"),
    ]);
    await userEvent.type(screen.getByRole("textbox", { name: "Batch name" }), "Week 42");
    await choose("Agent for every file", "Ravi Kumar (AG001)");
    await choose("Product for every file", "ULIP");
    await userEvent.click(screen.getByRole("button", { name: /Upload 2 files/ }));

    await waitFor(() => {
      expect(bodies).toHaveLength(1);
    });
    expect(bodies[0]).toMatchObject({
      batchName: "Week 42",
      files: [
        { agentId: "a1", productId: "p1" },
        { agentId: "a1", productId: "p1" },
      ],
    });
  });

  it("shows the reason when the storage upload fails", async () => {
    FakeXhr.status = 403;
    server.use(
      http.post("*/api/uploads/sign", () =>
        HttpResponse.json({
          uploads: [{ path: "u1/x.wav", signedUrl: "https://storage.test/up/x", token: "t" }],
        }),
      ),
    );
    await renderInRouter(<UploadForm reference={reference} />);

    await userEvent.upload(screen.getByLabelText("Choose recordings"), [
      new File([new Uint8Array(10)], "call.mp3"),
    ]);
    await choose("Agent for call.mp3", "Ravi Kumar (AG001)");
    await choose("Product for call.mp3", "ULIP");
    await userEvent.click(screen.getByRole("button", { name: /Upload 1 file/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed (403)");
    // The failed file stays on the page with its reason, ready to try again.
    expect(within(screen.getByRole("table")).getByText("Upload failed (403)")).toBeInTheDocument();
  });

  it("loads the reference lists before showing the form", async () => {
    server.use(http.get("*/api/reference", () => HttpResponse.json(reference)));

    await renderInRouter(<UploadPage />);

    expect(await screen.findByRole("heading", { name: "Upload calls" })).toBeInTheDocument();
  });
});

describe("review flow (US-01-006)", () => {
  it("completes a review once every finding has a decision", async () => {
    const decided = detail();
    decided.findings = decided.findings.map((f) => ({
      ...f,
      review: {
        decision: "agree" as const,
        note: null,
        reviewerName: "Priya",
        updatedAt: "2026-10-01T10:00:00Z",
      },
    }));
    const complete = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(
      http.get("*/api/calls/:id", () => HttpResponse.json(decided)),
      http.post("*/api/calls/:id/review/complete", complete),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    expect(await screen.findByText("Every finding has a decision")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Complete review" }));

    await waitFor(() => {
      expect(complete).toHaveBeenCalledTimes(1);
    });
  });

  it("saves a disagree decision with a note", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get("*/api/calls/:id", () => HttpResponse.json(detail())),
      http.put("*/api/findings/:id/review", async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    const [addNote] = await screen.findAllByRole("button", { name: "Add note" });
    await userEvent.click(addNote!);
    await userEvent.type(screen.getByLabelText("Reviewer note"), "Customer misheard");
    await userEvent.click(screen.getAllByRole("button", { name: "Disagree" })[0]!);

    await waitFor(() => {
      expect(bodies).toEqual([{ decision: "disagree", note: "Customer misheard" }]);
    });
  });

  it("adds a finding the judge missed", async () => {
    const add = vi.fn(async ({ request }: { request: Request }) => {
      expect(await request.json()).toEqual({
        itemKey: "false_urgency",
        status: "breach",
        segmentSeq: 1,
      });
      return HttpResponse.json({ id: "f9" }, { status: 201 });
    });
    server.use(http.post("*/api/calls/:id/findings", add));
    await renderInRouter(
      <AddFindingDialog callId="c1" items={DEFAULT_RUBRIC} segments={detail().segments} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Add missed finding" }));
    await choose("Rubric item", "False urgency");
    await choose("What happened", "Breach");
    await choose("Transcript line (optional)", "01:05 agent: This plan gives guaranteed returns.");
    await userEvent.click(screen.getByRole("button", { name: "Add finding" }));

    await waitFor(() => {
      expect(add).toHaveBeenCalledTimes(1);
    });
  });

  it("retries a failed call", async () => {
    const retry = vi.fn(() => HttpResponse.json({ status: "queued" }, { status: 202 }));
    const failed = detail();
    failed.call = {
      ...failed.call,
      status: "failed",
      error: "Transcription failed after several attempts; retry later",
    };
    server.use(
      http.get("*/api/calls/:id", () => HttpResponse.json(failed)),
      http.post("*/api/calls/:id/retry", retry),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    await userEvent.click(await screen.findByRole("button", { name: /Retry/ }));

    await waitFor(() => {
      expect(retry).toHaveBeenCalledTimes(1);
    });
  });
});

describe("rubric page (US-01-004)", () => {
  const version = (n: number, over: Record<string, unknown> = {}) => ({
    id: `r${String(n)}`,
    version: n,
    name: n === 2 ? "Strict wording" : `Rubric ${String(n)}`,
    items: DEFAULT_RUBRIC.slice(0, n === 2 ? 1 : 2),
    isActive: false,
    createdAt: "2026-10-01T00:00:00Z",
    ...over,
  });
  const active = version(7, { isActive: true });
  const all = [1, 2, 3, 4, 5, 6].map((n) => version(n)).concat(active);

  function serve(role: "qa_reviewer" | "manager") {
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me(role))),
      http.get("*/api/rubrics/active", () => HttpResponse.json(active)),
      http.get("*/api/rubrics", () => HttpResponse.json({ items: all })),
    );
  }

  it("shows the active rubric read-only to QA, with no item actions", async () => {
    serve("qa_reviewer");

    await renderInRouter(<RubricPage />);

    expect(await screen.findByText(/Version 7 is active/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save as version/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Actions for/ })).not.toBeInTheDocument();
  });

  it("pages through versions five at a time, newest first", async () => {
    serve("qa_reviewer");
    await renderInRouter(<RubricPage />);
    const list = () => within(screen.getByRole("list", { name: "Rubric versions" }));

    await screen.findByRole("list", { name: "Rubric versions" });
    expect(
      list()
        .getAllByRole("button")
        .map((b) => b.textContent.slice(0, 2)),
    ).toEqual(["v7", "v6", "v5", "v4", "v3"]);
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(
      list()
        .getAllByRole("button")
        .map((b) => b.textContent.slice(0, 2)),
    ).toEqual(["v2", "v1"]);
  });

  it("finds a version by name or number", async () => {
    serve("qa_reviewer");
    await renderInRouter(<RubricPage />);
    const search = await screen.findByRole("searchbox", { name: "Search versions" });
    const list = () => within(screen.getByRole("list", { name: "Rubric versions" }));

    await userEvent.type(search, "strict");
    expect(list().getAllByRole("button")).toHaveLength(1);
    await userEvent.clear(search);
    await userEvent.type(search, "v4");

    expect(list().getByRole("button")).toHaveTextContent("Rubric 4");
    expect(screen.queryByRole("navigation", { name: "Version pages" })).not.toBeInTheDocument();
  });

  it("shows an older version read-only, and lets a manager start a new version from it", async () => {
    serve("manager");
    await renderInRouter(<RubricPage />);

    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Search versions" }),
      "strict",
    );
    await userEvent.click(screen.getByRole("button", { name: /^v2/ }));

    expect(screen.getByText("Viewing v2 (not active)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Actions for/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit as new version" }));
    expect(screen.getByRole("textbox", { name: "Rubric name" })).toHaveValue("Strict wording");
    expect(screen.getByRole("button", { name: "Save as version 8" })).toBeInTheDocument();
  });
});

describe("scorecard page", () => {
  it("shows an error when the agent is unknown", async () => {
    server.use(
      http.get("*/api/scorecard/:id", () =>
        HttpResponse.json(
          { error: { code: "not_found", message: "agent not found" } },
          { status: 404 },
        ),
      ),
    );

    await renderInRouter(<ScorecardPage agentId="x" />);

    expect(await screen.findByText("agent not found")).toBeInTheDocument();
  });
});
