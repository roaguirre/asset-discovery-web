import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StoryCropFigure, StoryProofStage } from "./StoryMockViews";

const sampleCrop = {
  key: "run-overview",
  label: "Run Overview",
  title: "Coverage, judgment, and exports stay in one run summary.",
  caption:
    "The run surface exposes waves, assets, judge totals, and export state without leaving the workspace.",
} as const;

describe("StoryCropFigure", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the full caption copy by default", () => {
    const { container } = render(
      <StoryCropFigure crop={sampleCrop}>
        <div>Mock surface</div>
      </StoryCropFigure>,
    );

    const crop = container.querySelector(
      '[aria-label="Run Overview mock view"]',
    ) as HTMLElement;

    expect(crop).not.toBeNull();
    expect(within(crop).getByText("Run Overview")).toBeInTheDocument();
    expect(
      within(crop).getByText(
        "Coverage, judgment, and exports stay in one run summary.",
      ),
    ).toBeInTheDocument();
    expect(
      within(crop).getByText(
        "The run surface exposes waves, assets, judge totals, and export state without leaving the workspace.",
      ),
    ).toBeInTheDocument();
  });

  it("renders only the label when caption mode is label-only", () => {
    const { container } = render(
      <StoryCropFigure crop={sampleCrop} captionMode="label-only">
        <div>Mock surface</div>
      </StoryCropFigure>,
    );

    const crop = container.querySelector(
      ".story-crop.has-label-only-caption",
    ) as HTMLElement;

    expect(within(crop).getByText("Run Overview")).toBeInTheDocument();
    expect(
      within(crop).queryByText(
        "Coverage, judgment, and exports stay in one run summary.",
      ),
    ).toBeNull();
    expect(
      within(crop).queryByText(
        "The run surface exposes waves, assets, judge totals, and export state without leaving the workspace.",
      ),
    ).toBeNull();
  });

  it("hides the figcaption when caption mode is hidden", () => {
    const { container } = render(
      <StoryCropFigure crop={sampleCrop} captionMode="hidden">
        <div>Mock surface</div>
      </StoryCropFigure>,
    );

    const crop = container.querySelector(
      ".story-crop.has-hidden-caption",
    ) as HTMLElement;

    expect(crop).not.toBeNull();
    expect(crop.querySelector("figcaption")).toBeNull();
    expect(within(crop).getByText("Mock surface")).toBeInTheDocument();
    expect(within(crop).queryByText("Run Overview")).toBeNull();
    expect(
      within(crop).queryByText(
        "Coverage, judgment, and exports stay in one run summary.",
      ),
    ).toBeNull();
  });
});

describe("StoryProofStage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the copy and proof surface when the proof sits on the right", () => {
    const { container } = render(
      <StoryProofStage
        eyebrow="Review Surface"
        title="Ambiguous expansion stops being silent."
        copy="The product asks for an explicit decision instead of widening scope quietly."
        side="right"
      >
        <div>Proof surface</div>
      </StoryProofStage>,
    );

    expect(screen.getByText("Review Surface")).toBeInTheDocument();
    expect(screen.getByText("Ambiguous expansion stops being silent.")).toBeInTheDocument();
    expect(screen.getByText("Proof surface")).toBeInTheDocument();
    expect(container.querySelector(".story-proof-stage.proof-right")).not.toBeNull();
  });

  it("renders the left-proof variant class when the proof leads the stage", () => {
    const { container } = render(
      <StoryProofStage
        eyebrow="Judge Analysis"
        title="Discarded candidates stay part of the evidence."
        copy="Accepted and discarded cases remain in the same frame."
        side="left"
      >
        <div>Judge surface</div>
      </StoryProofStage>,
    );

    expect(screen.getByText("Judge surface")).toBeInTheDocument();
    expect(container.querySelector(".story-proof-stage.proof-left")).not.toBeNull();
  });
});
