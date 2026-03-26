import type { ReactNode } from "react";

export type SurfaceTopbarProps = {
  start: ReactNode;
  middle?: ReactNode;
  end?: ReactNode;
  className?: string;
  innerClassName?: string;
  sticky?: boolean;
};

/**
 * SurfaceTopbar owns the shared outer chrome for top-level app surfaces while
 * leaving each surface responsible for its own controls and state. The outer
 * header provides the backdrop and positioning; the inner row carries the
 * aligned content frame for the current surface.
 */
export function SurfaceTopbar({
  start,
  middle,
  end,
  className,
  innerClassName,
  sticky = false,
}: SurfaceTopbarProps) {
  const classes = [
    "surface-topbar",
    sticky ? "is-sticky" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");
  const innerClasses = ["surface-topbar-inner", innerClassName ?? null]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <div className={innerClasses}>
        <div className="surface-topbar-start">{start}</div>
        <div className="surface-topbar-middle">{middle ?? null}</div>
        <div className="surface-topbar-end">{end ?? null}</div>
      </div>
    </header>
  );
}
