import type { ReactNode } from "react";

export type SurfaceDrawerOverlayProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  scrimClassName?: string;
  drawerClassName?: string;
  children: ReactNode;
};

/**
 * SurfaceDrawerOverlay renders a shared fixed-position drawer shell for
 * compact viewports. It only mounts while open so hidden drawer content does
 * not remain reachable to keyboard or assistive technology users. Each surface
 * provides its own visual variant classes and drawer contents while the overlay
 * state and scrim behavior stay consistent.
 */
export function SurfaceDrawerOverlay({
  open,
  onClose,
  ariaLabel,
  scrimClassName,
  drawerClassName,
  children,
}: SurfaceDrawerOverlayProps) {
  if (!open) {
    return null;
  }

  const scrimClasses = [
    "surface-drawer-scrim",
    "is-open",
    scrimClassName ?? null,
  ]
    .filter(Boolean)
    .join(" ");
  const drawerClasses = [
    "surface-drawer-overlay",
    "is-open",
    drawerClassName ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={scrimClasses} onClick={onClose} />
      <aside className={drawerClasses} aria-label={ariaLabel}>
        {children}
      </aside>
    </>
  );
}
