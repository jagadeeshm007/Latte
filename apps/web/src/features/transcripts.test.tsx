import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { detail, summary } from "@/test/fixtures";
import { server } from "@/test/msw";
import { renderInRouter } from "@/test/render";

import { CallDetailPage } from "./calls/CallDetailPage";
import { rowFromText, rowProblem } from "./calls/transcript-rows";
import { UploadPage } from "./calls/UploadPage";

// Calls uploaded as transcripts, with no audio (ADR-0030).

const reference = {
  agents: [{ id: "a1", name: "Ravi Kumar", teamId: "t1", externalCode: "AG001" }],
  teams: [{ id: "t1", name: "Mumbai Inbound" }],
  products: [{ id: "p1", name: "ULIP" }],
};

beforeEach(() => {
  server.use(
    http.get("*/api/me", () =>
      HttpResponse.json({
        id: "u1",
        email: "u@test",
        displayName: "Test User",
        role: "qa_reviewer",
        agentId: null,
      }),
    ),
    http.get("*/api/reference", () => HttpResponse.json(reference)),
  );
});

async function choose(label: string, option: string) {
  await userEvent.click(await screen.findByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

describe("transcript upload", () => {
  it("reads a pasted transcript in the browser and sends its lines with the details", async () => {
    const posted: unknown[] = [];
    const sent = vi.fn(async ({ request }: { request: Request }) => {
      posted.push(await request.json());
      return HttpResponse.json({ batchId: "b1", callIds: ["c1"] }, { status: 201 });
    });
    server.use(http.post("*/api/uploads/transcripts", sent));
    await renderInRouter(<UploadPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Transcripts" }));
    await userEvent.type(
      screen.getByLabelText("Or paste one"),
      "Agent: Good morning.{enter}Customer: Hi.",
    );
    await userEvent.click(screen.getByRole("button", { name: /Add pasted transcript/ }));
    expect(await screen.findByText("2 lines, no times: shown by line")).toBeInTheDocument();
    await choose("Agent for Pasted 1.txt", "Ravi Kumar (AG001)");
    await choose("Product for Pasted 1.txt", "ULIP");
    await userEvent.click(screen.getByRole("button", { name: /Upload 1 transcript/ }));

    await waitFor(() => {
      expect(sent).toHaveBeenCalledOnce();
    });
    expect(posted[0]).toEqual({
      transcripts: [
        expect.objectContaining({
          originalFilename: "Pasted 1.txt",
          agentId: "a1",
          teamId: "t1",
          productId: "p1",
          language: "en-IN",
          lines: [
            { speaker: "agent", text: "Good morning." },
            { speaker: "customer", text: "Hi." },
          ],
        }),
      ],
    });
  });

  it("shows why a transcript cannot be read and keeps Upload off", async () => {
    await renderInRouter(<UploadPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Transcripts" }));
    await userEvent.upload(screen.getByLabelText("Choose transcripts"), [
      new File(["hello, who is this?"], "notes.txt", { type: "text/plain" }),
    ]);

    expect(await screen.findByText(/line 1: start with a speaker label/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload 1 transcript/ })).toBeDisabled();
  });
});

describe("transcript upload, several at once", () => {
  it("sets details for every transcript, names the batch, and keeps them when the upload fails", async () => {
    const posted: unknown[] = [];
    server.use(
      http.post("*/api/uploads/transcripts", async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json(
          { error: { code: "validation_error", message: "unknown agent, team or product" } },
          { status: 400 },
        );
      }),
    );
    await renderInRouter(<UploadPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Transcripts" }));
    await userEvent.upload(screen.getByLabelText("Choose transcripts"), [
      new File(["Agent: One."], "one.txt", { type: "text/plain" }),
      new File(['[{"speaker":"customer","text":"Two.","startMs":0,"endMs":500}]'], "two.json", {
        type: "application/json",
      }),
    ]);
    expect(await screen.findByText("1 lines, with times")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/Dialler export/), "Week 42");
    await choose("Agent for every transcript", "Ravi Kumar (AG001)");
    await choose("Product for every transcript", "ULIP");
    await choose("Language for every transcript", "Hindi");
    await userEvent.click(screen.getByRole("button", { name: /Upload 2 transcripts/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("unknown agent, team or product");
    expect(posted[0]).toMatchObject({
      batchName: "Week 42",
      transcripts: [
        {
          originalFilename: "one.txt",
          agentId: "a1",
          teamId: "t1",
          productId: "p1",
          language: "hi-IN",
        },
        { originalFilename: "two.json", language: "hi-IN" },
      ],
    });
    expect(screen.getByRole("table", { name: "Transcripts to upload" })).toHaveTextContent(
      "two.json",
    );
  });
});

describe("transcript rows", () => {
  it("keeps the lines of a readable transcript and asks for what is missing", () => {
    const row = rowFromText("a.txt", "[00:01] Agent: Hello.\n[00:03] Customer: Hi.", "k1");

    expect(row.lines).toHaveLength(2);
    expect(rowProblem(row)).toBe("Choose the agent");
    expect(rowProblem({ ...row, agentId: "a1", teamId: "t1", productId: "p1" })).toBeNull();
  });
});

describe("a call uploaded as a transcript", () => {
  it("has no player, and points findings and lines to line numbers when untimed", async () => {
    const call = detail({
      call: summary({ input: "transcript", timed: false, originalFilename: "call.txt" }),
      audioAvailable: false,
    });
    server.use(http.get("*/api/calls/:id", () => HttpResponse.json(call)));

    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    expect(
      await screen.findByText(/Uploaded as a transcript, so there is no recording to play/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^Line \d+$/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^Play from/ })).toBeNull();
  });

  it("offers only the transcript formats that work without times, and no recording", async () => {
    const call = detail({
      call: summary({ input: "transcript", timed: false, originalFilename: "call.txt" }),
      audioAvailable: false,
    });
    server.use(http.get("*/api/calls/:id", () => HttpResponse.json(call)));
    await renderInRouter(<CallDetailPage callId="11111111-1111-4111-8111-111111111111" />);

    await userEvent.click(await screen.findByRole("button", { name: "Download" }));

    const items = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
    expect(items.some((t) => t.includes("Text (.txt)"))).toBe(true);
    expect(items.some((t) => t.includes("JSON (.json)"))).toBe(true);
    expect(items.some((t) => t.includes("SubRip") || t.includes("Recording"))).toBe(false);
  });
});
