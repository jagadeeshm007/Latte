import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LatteMark } from "./LatteMark";

describe("LatteMark", () => {
  it("is hidden from screen readers by default, since a name always sits beside it", () => {
    const { container } = render(<LatteMark />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("names itself when given a label", () => {
    render(<LatteMark label="Latte" />);

    expect(screen.getByRole("img", { name: "Latte" })).toBeInTheDocument();
  });

  it("drops to two pour layers in the small cut so it holds at favicon sizes", () => {
    const full = render(<LatteMark />).container.querySelectorAll("circle").length;
    const small = render(<LatteMark small />).container.querySelectorAll("circle").length;

    expect(full).toBe(6);
    expect(small).toBe(4);
  });
});
