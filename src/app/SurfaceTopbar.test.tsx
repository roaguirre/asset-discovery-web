import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SurfaceTopbar } from "./SurfaceTopbar";

describe("SurfaceTopbar", () => {
  it("renders the required start slot without optional slots", () => {
    const { container } = render(<SurfaceTopbar start={<span>Start</span>} />);

    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(
      container.querySelector(".surface-topbar-middle:empty"),
    ).not.toBeNull();
    expect(
      container.querySelector(".surface-topbar-end:empty"),
    ).not.toBeNull();
    expect(container.querySelector(".surface-topbar.is-sticky")).toBeNull();
  });

  it("renders optional middle and end slots and applies sticky chrome", () => {
    const { container } = render(
      <SurfaceTopbar
        start={<span>Brand</span>}
        middle={<nav aria-label="Sections">Links</nav>}
        end={<button type="button">Primary</button>}
        className="story-topbar"
        sticky
      />,
    );

    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Primary" })).toBeVisible();
    expect(
      container.querySelector(".surface-topbar.story-topbar.is-sticky"),
    ).not.toBeNull();
  });
});
