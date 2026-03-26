import { describe, expect, it } from "vitest";
import {
  buildCreateRunPayload,
  hasSeedIdentityInput,
  parseDelimitedValues,
  validateCreateRunPayload,
} from "./runForm";

describe("runForm", () => {
  /**
   * Normalizes mixed comma and newline input into compact seed values.
   */
  it("parses delimited domain input", () => {
    expect(parseDelimitedValues(" example.com,\napi.example.com ,, test.example "))
      .toEqual(["example.com", "api.example.com", "test.example"]);
  });

  /**
   * Reveals optional seed fields only after the form contains identifying seed
   * data.
   */
  it("detects whether the form has seed identity input", () => {
    expect(
      hasSeedIdentityInput({
        companyName: "",
        domains: "   ",
        address: "",
        industry: "",
        mode: "autonomous",
      }),
    ).toBe(false);

    expect(
      hasSeedIdentityInput({
        companyName: "Example",
        domains: "",
        address: "",
        industry: "",
        mode: "manual",
      }),
    ).toBe(true);
  });

  /**
   * Builds and validates the backend payload without leaking empty strings into
   * the request body.
   */
  it("builds a trimmed create-run payload and validates missing identity", () => {
    const payload = buildCreateRunPayload({
      companyName: " Example Holdings ",
      domains: "example.com,\napi.example.com",
      address: " 123 Market St ",
      industry: " Retail ",
      mode: "manual",
    });

    expect(payload).toEqual({
      mode: "manual",
      seeds: [
        {
          company_name: "Example Holdings",
          domains: ["example.com", "api.example.com"],
          address: "123 Market St",
          industry: "Retail",
        },
      ],
    });

    expect(
      validateCreateRunPayload({
        mode: "autonomous",
        seeds: [{ company_name: undefined, domains: [] }],
      }),
    ).toBe("Enter a company name or at least one domain.");
  });
});
