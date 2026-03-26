import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SurfaceDrawerToggleButton } from "./SurfaceDrawerToggleButton";

describe("SurfaceDrawerToggleButton", () => {
  it("renders the shared topbar affordance and forwards toggle events", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <SurfaceDrawerToggleButton
        open={false}
        label="Open navigation"
        onToggle={onToggle}
      />,
    );

    const button = screen.getByRole("button", { name: "Open navigation" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("reflects the open state through aria-expanded", () => {
    render(
      <SurfaceDrawerToggleButton
        open
        label="Close navigation"
        onToggle={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
