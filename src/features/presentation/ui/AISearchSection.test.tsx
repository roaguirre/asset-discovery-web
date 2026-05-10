import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AISearchSection } from "./AISearchSection";
import { storyAISearchSection } from "./storyModel";

describe("AISearchSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the dedicated AI-search section with stages and examples", () => {
    const { container } = render(
      <AISearchSection
        className="story-architecture-ai-search"
        headingLevel="h3"
        section={storyAISearchSection}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Search-backed expansion stays bounded by the same decision loop.",
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Run Context")).toBeInTheDocument();
    expect(screen.getByText("Web Search + Structured Output")).toBeInTheDocument();
    expect(screen.getByText("exampleapp.io")).toBeInTheDocument();
    expect(screen.getByText("exampleapp-status.co")).toBeInTheDocument();
    expect(screen.getAllByText("ai_search_collector")).not.toHaveLength(0);
    expect(screen.getByText("Pending review")).toBeInTheDocument();
    expect(container.querySelector(".story-architecture-ai-search")).not.toBeNull();
    expect(document.querySelector("#ai-search")).toBeNull();
  });
});
