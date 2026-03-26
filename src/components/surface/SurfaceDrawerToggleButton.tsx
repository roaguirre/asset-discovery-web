type SurfaceDrawerToggleButtonProps = {
  open: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
};

/**
 * SurfaceDrawerToggleButton keeps the compact topbar drawer affordance
 * consistent across surfaces without coupling the button to drawer content.
 */
export function SurfaceDrawerToggleButton({
  open,
  label,
  onToggle,
  className,
}: SurfaceDrawerToggleButtonProps) {
  const classes = ["topbar-drawer-toggle", className ?? null]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      aria-expanded={open}
      onClick={onToggle}
    >
      {open ? <CloseIcon /> : <DrawerIcon />}
    </button>
  );
}

function DrawerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}
