import { describe, expect, it, vi } from "vitest";
import {
  normalizeRunArtifactDownloadError,
  parseAPIResponse,
  preflightRunArtifactURL,
} from "./firebaseDeps";

describe("preflightRunArtifactURL", () => {
  it("returns the download URL when the preflight succeeds", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, { status: 200 });
    });
    await expect(
      preflightRunArtifactURL("https://downloads.test/results.csv", fetchImpl),
    ).resolves.toBe("https://downloads.test/results.csv");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://downloads.test/results.csv",
      { method: "HEAD" },
    );
  });

  it("surfaces a generic unavailable error when the preflight fails", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, { status: 412, statusText: "Precondition Failed" });
    });
    await expect(
      preflightRunArtifactURL("https://downloads.test/results.csv", fetchImpl),
    ).rejects.toThrow("Downloads unavailable right now.");
  });
});

describe("normalizeRunArtifactDownloadError", () => {
  it("collapses known Firebase download token failures into a generic error", () => {
    const error = normalizeRunArtifactDownloadError({
      code: "storage/unknown",
      customData: {
        serverResponse:
          '{"error":{"code":412,"message":"A required service account is missing necessary permissions."}}',
      },
    });
    expect(error.message).toBe("Downloads unavailable right now.");
  });

  it("preserves unrelated errors", () => {
    const error = normalizeRunArtifactDownloadError(
      new Error("temporary network issue"),
    );
    expect(error.message).toBe("temporary network issue");
  });
});

describe("parseAPIResponse", () => {
  it("surfaces empty proxy failures without throwing a JSON parse error", async () => {
    await expect(
      parseAPIResponse(
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        }),
      ),
    ).rejects.toThrow("500 Internal Server Error");
  });

  it("uses explicit API error messages when JSON is present", async () => {
    await expect(
      parseAPIResponse(
        new Response(JSON.stringify({ error: "email is not allowlisted" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toThrow("email is not allowlisted");
  });
});
