import type { Segment } from "@scc/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { detail } from "@/test/fixtures";

import { Waveform } from "./Waveform";

const segments: Segment[] = [
  {
    seq: 0,
    channel: "agent",
    startMs: 0,
    endMs: 30_000,
    text: "Hello, this is Ravi from Suraksha.",
    language: "en",
    avgLogprob: null,
    translation: null,
    words: [],
  },
  {
    seq: 1,
    channel: "customer",
    startMs: 30_000,
    endMs: 60_000,
    text: "What returns can I expect?",
    language: "en",
    avgLogprob: null,
    translation: null,
    words: [],
  },
];

function renderWave(over: Partial<Parameters<typeof Waveform>[0]> = {}) {
  const onSeek = vi.fn();
  const onScrub = vi.fn();
  const onHover = vi.fn();
  const view = render(
    <Waveform
      segments={segments}
      findings={[]}
      durationMs={60_000}
      nowMs={10_000}
      peaks={undefined}
      hoveredSeq={null}
      onHover={onHover}
      onScrub={onScrub}
      onSeek={onSeek}
      {...over}
    />,
  );
  return { onSeek, onScrub, onHover, view };
}

describe("Waveform", () => {
  it("is one slider that names the playhead position", () => {
    renderWave();

    const slider = screen.getByRole("slider", { name: "Seek in the recording" });

    expect(slider).toHaveAttribute("aria-valuetext", "00:10 of 01:00");
  });

  it("seeks five seconds per arrow key, and to the ends with Home and End", async () => {
    const { onSeek } = renderWave();
    screen.getByRole("slider").focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(onSeek).toHaveBeenLastCalledWith(15_000);

    await userEvent.keyboard("{End}");
    expect(onSeek).toHaveBeenLastCalledWith(60_000);

    await userEvent.keyboard("{Home}");
    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it("reports the segment under the pointer, and names the hovered one", () => {
    const { onHover } = renderWave({ hoveredSeq: 1 });
    // The registry Waveform's root wraps its control; pointer position is measured on the root.
    const strip = screen.getByRole("slider").closest('[data-slot="waveform"]')!.parentElement!;
    strip.getBoundingClientRect = () => ({ left: 0, width: 600 }) as DOMRect;

    fireEvent.pointerMove(strip, { clientX: 100 });
    expect(onHover).toHaveBeenLastCalledWith(0);
    fireEvent.pointerLeave(strip);
    expect(onHover).toHaveBeenLastCalledWith(null);

    expect(screen.getByRole("tooltip")).toHaveTextContent("Customer");
    expect(screen.getByRole("tooltip")).toHaveTextContent("What returns can I expect?");
  });

  it("tints each segment in its speaker's colour and marks each cited finding", () => {
    const { view } = renderWave({ findings: detail().findings });

    const regions = view.container.querySelectorAll("[data-speaker]");

    expect([...regions].map((r) => r.getAttribute("data-speaker"))).toEqual(["agent", "customer"]);
    expect(view.container.querySelectorAll(".bg-speaker-agent")).toHaveLength(1);
    expect(view.container.querySelectorAll(".bg-speaker-customer")).toHaveLength(1);
    expect(view.container.querySelectorAll(".bg-destructive")).toHaveLength(1);
    expect(view.container.querySelectorAll(".bg-success")).toHaveLength(1);
  });

  it("draws nothing for a call with no length", () => {
    const { view } = renderWave({ durationMs: 0, segments: [] });

    expect(view.container).toBeEmptyDOMElement();
  });
});
