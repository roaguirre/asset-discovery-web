import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SurfaceDrawerOverlay } from "./SurfaceDrawerOverlay";

describe("SurfaceDrawerOverlay", () => {
  it("applies shared open state to the scrim and drawer", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SurfaceDrawerOverlay
        open
        onClose={onClose}
        ariaLabel="Story navigation"
        scrimClassName="story-drawer-scrim"
        drawerClassName="story-drawer"
      >
        <div>Drawer content</div>
      </SurfaceDrawerOverlay>,
    );

    expect(
      container.querySelector(".surface-drawer-scrim.story-drawer-scrim.is-open"),
    ).not.toBeNull();
    expect(
      container.querySelector(".surface-drawer-overlay.story-drawer.is-open"),
    ).not.toBeNull();
    expect(screen.getByLabelText("Story navigation")).toHaveTextContent(
      "Drawer content",
    );
  });

  it("does not render the drawer tree while closed", () => {
    const onClose = vi.fn();

    render(
      <SurfaceDrawerOverlay
        open={false}
        onClose={onClose}
        ariaLabel="Workspace navigation"
        scrimClassName="drawer-scrim"
        drawerClassName="app-drawer"
      >
        <div>Workspace drawer</div>
      </SurfaceDrawerOverlay>,
    );

    expect(screen.queryByLabelText("Workspace navigation")).toBeNull();
  });

  it("closes when the shared scrim is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <SurfaceDrawerOverlay
        open
        onClose={onClose}
        ariaLabel="Workspace navigation"
        scrimClassName="drawer-scrim"
        drawerClassName="app-drawer"
      >
        <div>Workspace drawer</div>
      </SurfaceDrawerOverlay>,
    );

    fireEvent.click(
      container.querySelector(".surface-drawer-scrim.drawer-scrim") as Element,
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
