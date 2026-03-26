import type { ReactNode } from "react";

export type SurfaceTopbarProps = {
  start: ReactNode;
  middle?: ReactNode;
  end?: ReactNode;
  className?: string;
  sticky?: boolean;
};

/**
 * SurfaceTopbar owns the shared outer chrome for top-level app surfaces.
 * Story and workspace views pass their own controls into the slots so layout
 * can be reused without coupling unrelated navigation or menu behavior.
 */
export function SurfaceTopbar({
  start,
  middle,
  end,
  className,
  sticky = false,
}: SurfaceTopbarProps) {
  const classes = [
    "surface-topbar",
    sticky ? "is-sticky" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <div className="surface-topbar-start">{start}</div>
      <div className="surface-topbar-middle">{middle ?? null}</div>
      <div className="surface-topbar-end">{end ?? null}</div>
    </header>
  );
}
