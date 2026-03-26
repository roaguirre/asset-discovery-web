import type { LiveAuthSession, LiveRunRecord } from "../core/types";

/**
 * formatDate renders exported timestamps using the user's locale while leaving
 * non-date strings untouched.
 */
export function formatDate(value: string | undefined): string {
  if (!value) {
    return "Pending";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

/**
 * formatScore converts a recommendation score into concise review copy.
 */
export function formatScore(score: number | undefined): string {
  if (typeof score !== "number") {
    return "No score";
  }
  return `${Math.round(score * 100)}% confidence`;
}

/**
 * formatStatus keeps the stored machine token readable in the UI without
 * changing the underlying value.
 */
export function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

/**
 * formatRunSelectorLabel centralizes the visible run selector label so the
 * selector can evolve without duplicating formatting logic.
 */
export function formatRunSelectorLabel(run: LiveRunRecord): string {
  return run.id;
}

/**
 * sessionLabel returns the most human-friendly visible label for the current
 * signed-in account.
 */
export function sessionLabel(session: LiveAuthSession): string {
  return (
    session.displayName?.trim() || session.email.split("@")[0] || session.email
  );
}

/**
 * sessionInitials derives the compact avatar label shown in the workspace
 * header.
 */
export function sessionInitials(session: LiveAuthSession): string {
  const label = session.displayName?.trim() || session.email;
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
