import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "neutral" | "white" | "primary" | "accent" | "success" | "warning" | "error" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-100 text-ink-700",
  white: "bg-white text-ink-700",
  primary: "bg-primary-100 text-primary-800",
  accent: "bg-accent-100 text-accent-800",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  error: "bg-error-100 text-error-700",
  info: "bg-info-100 text-info-700",
};

/** Status tones always carry an icon. Decorative tones may pass one. */
const statusIcon: Partial<Record<Tone, ReactNode>> = {
  success: <CheckCircle2 aria-hidden size={14} />,
  warning: <AlertTriangle aria-hidden size={14} />,
  error: <XCircle aria-hidden size={14} />,
  info: <Info aria-hidden size={14} />,
};

/**
 * Small flat pill label. Status tones are icon + text — never color alone.
 * Use `white` on gray cards, `neutral` on white.
 */
export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${toneClass[tone]}`}
    >
      {statusIcon[tone] ?? icon}
      {children}
    </span>
  );
}
