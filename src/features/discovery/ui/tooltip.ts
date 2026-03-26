import type { FocusEvent, MouseEvent } from "react";

export type TooltipPlacement = "bottom" | "right";

export type TooltipState = {
  visible: boolean;
  text: string;
  x: number;
  y: number;
  placement: TooltipPlacement;
};

export const hiddenTooltip: TooltipState = {
  visible: false,
  text: "",
  x: 0,
  y: 0,
  placement: "bottom",
};

/**
 * resolveTooltipPlacement keeps tooltip placement declarative at the anchor so
 * shared overlay callers can opt into side placement without custom handlers.
 */
function resolveTooltipPlacement(element: HTMLElement): TooltipPlacement {
  return element.dataset.tooltipPlacement === "right" ? "right" : "bottom";
}

/**
 * findTooltipElement returns the closest still-mounted tooltip anchor from the
 * event target so the shared overlay can follow focus and hover consistently.
 */
export function findTooltipElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const matched = target.closest<HTMLElement>("[data-tooltip]");
  return matched && document.body.contains(matched) ? matched : null;
}

/**
 * showTooltip positions the shared tooltip relative to the current anchor.
 */
export function showTooltip(
  element: HTMLElement,
  setTooltip: (
    updater: TooltipState | ((current: TooltipState) => TooltipState),
  ) => void,
) {
  const text = element.dataset.tooltip;
  if (!text) {
    return;
  }
  const rect = element.getBoundingClientRect();
  const placement = resolveTooltipPlacement(element);
  if (placement === "right") {
    setTooltip({
      visible: true,
      text,
      x: rect.right + 12,
      y: rect.top + rect.height / 2,
      placement,
    });
    return;
  }

  setTooltip({
    visible: true,
    text,
    x: rect.left + rect.width / 2,
    y: rect.bottom + 12,
    placement,
  });
}

/**
 * hideTooltip clears the shared tooltip only when it is currently visible.
 */
export function hideTooltip(
  setTooltip: (
    updater: TooltipState | ((current: TooltipState) => TooltipState),
  ) => void,
) {
  setTooltip((current) => (current.visible ? hiddenTooltip : current));
}

/**
 * tooltipIfNeeded exposes full text only when the rendered copy is likely to
 * truncate in the table or detail views.
 */
export function tooltipIfNeeded(
  value: string,
  limit: number,
): string | undefined {
  return value.length > limit ? value : undefined;
}

/**
 * handleTooltipOverOrFocus updates the shared tooltip from hover or focus
 * events without duplicating lookup logic at the callsite.
 */
export function handleTooltipOverOrFocus(
  event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
  setTooltip: (
    updater: TooltipState | ((current: TooltipState) => TooltipState),
  ) => void,
) {
  const target = findTooltipElement(event.target);
  if (target) {
    showTooltip(target, setTooltip);
    return;
  }
  hideTooltip(setTooltip);
}

/**
 * handleTooltipMove keeps the shared tooltip aligned with the hovered anchor as
 * the pointer moves through the workspace.
 */
export function handleTooltipMove(
  event: MouseEvent<HTMLElement>,
  setTooltip: (
    updater: TooltipState | ((current: TooltipState) => TooltipState),
  ) => void,
) {
  const target = findTooltipElement(event.target);
  if (target) {
    showTooltip(target, setTooltip);
  }
}
