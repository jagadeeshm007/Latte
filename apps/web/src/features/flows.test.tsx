import { DEFAULT_RUBRIC } from "@scc/shared";
import { screen, waitFor } from "@testing-library/react";
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

    expect(await screen.findByText("Upload failed (403)")).toBeInTheDocument();
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

  it("shows the error when the recording cannot be fetched", async () => {
    server.use(
      http.get("*/api/calls/:id", () => HttpResponse.json(detail())),
      http.post("*/api/calls/:id/audio-url", () =>
        HttpResponse.json(
          { error: { code: "audio_purged", message: "the audio for this call has been deleted" } },
          { status: 410 },
        ),
      ),
    );
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    await userEvent.click(await screen.findByRole("button", { name: "Load and play recording" }));

    expect(await screen.findByText("the audio for this call has been deleted")).toBeInTheDocument();
  });
});

describe("rubric page (US-01-004)", () => {
  const rubric = {
    id: "r",
    version: 2,
    name: "Default",
    items: DEFAULT_RUBRIC.slice(0, 2),
    isActive: true,
    createdAt: "2026-10-01T00:00:00Z",
  };

  it("shows the active rubric read-only to QA with its version history", async () => {
    server.use(
      http.get("*/api/rubrics/active", () => HttpResponse.json(rubric)),
      http.get("*/api/rubrics", () =>
        HttpResponse.json({
          items: [rubric, { ...rubric, id: "r1", version: 1, isActive: false }],
        }),
      ),
    );

    await renderInRouter(<RubricPage />);

    expect(await screen.findByText(/Version 2 is active/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save as version/ })).not.toBeInTheDocument();
    expect(await screen.findByText("v1")).toBeInTheDocument();
  });

  it("lets a manager add and remove items", async () => {
    server.use(
      http.get("*/api/me", () => HttpResponse.json(me("manager"))),
      http.get("*/api/rubrics/active", () => HttpResponse.json(rubric)),
      http.get("*/api/rubrics", () => HttpResponse.json({ items: [rubric] })),
    );
    await renderInRouter(<RubricPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Add item" }));
    expect(screen.getByDisplayValue("New item")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove New item" }));
    expect(screen.queryByDisplayValue("New item")).not.toBeInTheDocument();
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
