import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Loading } from "./states";

describe("Loading", () => {
  it.each(["page", "call", "table", "cards", "chart", "app", "text"] as const)(
    "shows a shimmering %s skeleton and names the wait once for screen readers",
    (shape) => {
      const { container } = render(<Loading label="Loading calls" shape={shape} />);

      expect(screen.getByRole("status")).toHaveTextContent(/^Loading calls$/);
      expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(2);
    },
  );
});
