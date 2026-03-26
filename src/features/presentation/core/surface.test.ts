import { describe, expect, it } from "vitest";
import {
  hasLiveHashState,
  parseExplicitSurface,
} from "./surface";

describe("presentation surface helpers", () => {
  it("parses supported explicit surface requests from search params", () => {
    expect(parseExplicitSurface("?surface=workspace")).toBe("workspace");
    expect(parseExplicitSurface("?surface=story")).toBe("story");
  });

  it("ignores unsupported or missing explicit surface requests", () => {
    expect(parseExplicitSurface("?surface=unknown")).toBeUndefined();
    expect(parseExplicitSurface("")).toBeUndefined();
  });

  it("treats live workspace hashes as console state", () => {
    expect(hasLiveHashState("#view=assets")).toBe(true);
    expect(hasLiveHashState("#run=run-1&view=trace&asset=asset-1")).toBe(true);
  });

  it("leaves presentation anchors out of live workspace detection", () => {
    expect(hasLiveHashState("#workflow")).toBe(false);
    expect(hasLiveHashState("#open-source")).toBe(false);
    expect(hasLiveHashState("")).toBe(false);
  });
});
