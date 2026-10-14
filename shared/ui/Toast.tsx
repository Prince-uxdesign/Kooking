import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Tone = "success" | "warning" | "error" | "info";

const config = {
  success: { Icon: CheckCircle2, well: "bg-success-100 text-success-700" },
  warning: { Icon: AlertTriangle, well: "bg-warning-100 text-warning-700" },
  error: { Icon: XCircle, well: "bg-error-100 text-error-700" },
  info: { Icon: Info, well: "bg-info-100 text-info-700" },
} as const;

/** Non-blocking notification. Icon + text; role matches urgency. */
export function Toast({
  tone = "info",
  title,
  message,
}: {
  tone?: Tone;
  title: string;
  message?: string;
}) {
  const { Icon, well } = config[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="flex items-start gap-3 rounded-[20px] bg-surface-100 p-3 pr-4"
    >
      <span
        aria-hidden
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${well}`}
      >
        <Icon size={18} />
      </span>
      <div className="flex flex-col pt-0.5">
        <p className="text-sm font-medium text-ink-900">{title}</p>
        {message && <p className="text-sm leading-6 text-ink-500">{message}</p>}
      </div>
    </div>
  );
}
