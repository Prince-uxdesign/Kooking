import type { ReactNode } from "react";

/** Tab bar item: icon over label; active turns pepper orange in a tinted well. */
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
      className={`inline-flex min-h-[60px] min-w-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors ${
        active ? "text-primary-700" : "text-ink-500 hover:text-ink-900"
      }`}
    >
      <span
        aria-hidden
        className={`inline-flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-primary-50" : ""}`}
      >
        {icon}
      </span>
      <span aria-hidden>{label}</span>
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
      className="glass-bar inline-flex items-center gap-1 rounded-3xl border border-line-default px-2"
    >
      {children}
    </nav>
  );
}
