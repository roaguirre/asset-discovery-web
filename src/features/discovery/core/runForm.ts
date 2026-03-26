import type { CreateRunPayload, LiveRunMode } from "./types";

export type RunFormState = {
  companyName: string;
  domains: string;
  address: string;
  industry: string;
  mode: LiveRunMode;
};

export const initialRunFormState: RunFormState = {
  companyName: "",
  domains: "",
  address: "",
  industry: "",
  mode: "autonomous",
};

/**
 * parseDelimitedValues normalizes comma- or newline-delimited text input into
 * a compact list of non-empty values.
 */
export function parseDelimitedValues(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * hasSeedIdentityInput reveals optional seed metadata only after the user has
 * entered enough identity information to describe a real seed.
 */
export function hasSeedIdentityInput(formState: RunFormState): boolean {
  return (
    formState.companyName.trim().length > 0 ||
    parseDelimitedValues(formState.domains).length > 0
  );
}

/**
 * buildCreateRunPayload converts the current form state into the API payload
 * shape expected by the live backend.
 */
export function buildCreateRunPayload(
  formState: RunFormState,
): CreateRunPayload {
  return {
    mode: formState.mode,
    seeds: [
      {
        company_name: formState.companyName.trim() || undefined,
        domains: parseDelimitedValues(formState.domains),
        address: formState.address.trim() || undefined,
        industry: formState.industry.trim() || undefined,
      },
    ],
  };
}

/**
 * validateCreateRunPayload returns the first user-facing validation error, or
 * an empty string when the payload is ready to submit.
 */
export function validateCreateRunPayload(payload: CreateRunPayload): string {
  const firstSeed = payload.seeds[0];
  if (!firstSeed) {
    return "Add at least one seed before launching the run.";
  }
  if (!firstSeed.company_name && (firstSeed.domains?.length ?? 0) === 0) {
    return "Enter a company name or at least one domain.";
  }
  return "";
}
