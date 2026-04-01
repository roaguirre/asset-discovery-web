import { describe, expect, it } from "vitest";
import { describeSource } from "./assetTable";

describe("assetTable", () => {
  /**
   * Keeps the AI-search source label explicit so pivot and judge-summary UI
   * surfaces do not fall back to the generic unknown-source wording.
   */
  it("describes the AI search collector source", () => {
    expect(describeSource("ai_search_collector")).toContain(
      "LLM-assisted web search expansion",
    );
  });
});
