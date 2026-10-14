import type { ReactNode } from "react";

/** Item for the floating dark pill nav. Active = green circle; label stays for SR. */
export function NavItem({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active?: boolean;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={label}
      className={`inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-3.5 text-[0.875rem] font-medium transition-colors ${
        active ? "bg-primary-500 text-ink-900" : "bg-white/10 text-white hover:bg-white/15"
      }`}
    >
      <span aria-hidden>{icon}</span>
      {active && <span>{label}</span>}
    </button>
  );
}

export function BottomNav({
  children,
  label = "Primary",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 p-1.5"
    >
      {children}
    </nav>
  );
}
