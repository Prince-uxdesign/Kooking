"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  CircleDashed,
  HelpCircle,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ROW_STATE_LABEL,
  parseQuantityText,
  unitChoices,
  type KitchenCheckEntry,
  type KitchenCheckRow as Row,
  type RowState,
} from "@/shared/domain/kitchen-check";
import { fieldClasses } from "@/shared/ui/TextInput";

const STATE_ICON: Record<RowState, ReactNode> = {
  "not-checked": <CircleDashed aria-hidden size={18} strokeWidth={1.75} />,
  "have-enough": <CheckCircle2 aria-hidden size={18} strokeWidth={1.75} />,
  "not-enough": <AlertTriangle aria-hidden size={18} strokeWidth={1.75} />,
  missing: <XCircle aria-hidden size={18} strokeWidth={1.75} />,
  optional: <MinusCircle aria-hidden size={18} strokeWidth={1.75} />,
  alternative: <ArrowLeftRight aria-hidden size={18} strokeWidth={1.75} />,
  "needs-review": <HelpCircle aria-hidden size={18} strokeWidth={1.75} />,
};

const STATE_TEXT_CLASS: Record<RowState, string> = {
  "not-checked": "text-ink-500",
  "have-enough": "text-success-700",
  "not-enough": "text-warning-700",
  missing: "text-warning-700",
  optional: "text-ink-600",
  alternative: "text-info-700",
  "needs-review": "text-info-700",
};

const choiceBase =
  "inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full px-3 text-[15px] transition-colors";

function Choice({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`${choiceBase} ${
        pressed ? "bg-primary-500 text-ink-900" : "bg-white text-ink-900 hover:bg-surface-200"
      }`}
    >
      {children}
    </button>
  );
}

function numberString(n: number): string {
  return String(n);
}

export function KitchenCheckRow({
  row,
  onChange,
  onOpenAlternatives,
  onClearSubstitution,
  alternativeNames,
}: {
  row: Row;
  onChange: (entry: KitchenCheckEntry | null) => void;
  onOpenAlternatives: () => void;
  onClearSubstitution: () => void;
  /** Display names for this line's approved substitutes. */
  alternativeNames: string[];
}) {
  const quantified = row.requiredQuantity !== null;
  const entry = row.entry;
  const haveEnoughPressed = entry?.have === true && row.state === "have-enough";
  const haveSomePressed = entry?.have === true && !haveEnoughPressed;
  const dontHavePressed = entry?.have === false;
  const showAmount = quantified && entry?.have === true;
  const inputId = `qty-${row.lineId}`;
  const errorId = `${inputId}-error`;
  const detailBits = [row.preparation, row.note].filter(Boolean).join(" · ");

  const setHaveEnough = () => {
    if (haveEnoughPressed) return onChange(null);
    onChange({
      have: true,
      qtyText: quantified ? numberString(row.requiredQuantity!) : "",
      unit: row.requiredUnit,
    });
  };
  const setHaveSome = () => {
    if (haveSomePressed) return onChange(null);
    onChange({ have: true, qtyText: "", unit: row.requiredUnit });
  };
  const setDontHave = () => {
    if (dontHavePressed) return onChange(null);
    onChange({ have: false, qtyText: "", unit: null });
  };

  return (
    <li id={`row-${row.lineId}`} className="list-none scroll-mt-24">
      <div className="flex flex-col gap-4 rounded-[20px] bg-surface-100 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[16px] leading-6 text-ink-900">{row.name}</h3>
            {detailBits && <p className="text-[13px] leading-5 text-ink-500">{detailBits}</p>}
          </div>
          <p className="tnum shrink-0 text-right text-[17px] font-semibold leading-6 text-ink-900">
            <span className="sr-only">Need </span>
            {row.requiredDisplay}
            {row.approximate && <span className="sr-only"> (approximate)</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-700">
            {row.roleLabel}
          </span>
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 text-[14px] font-medium ${STATE_TEXT_CLASS[row.state]}`}
          >
            {STATE_ICON[row.state]}
            {ROW_STATE_LABEL[row.state]}
          </span>
        </div>

        {quantified && row.availableDisplay !== null && (
          <dl
            aria-label={`${row.name} quantities`}
            className="tnum grid grid-cols-3 gap-2 rounded-2xl bg-white px-4 py-3 text-[14px]"
          >
            <div>
              <dt className="text-[12px] text-ink-500">Required</dt>
              <dd className="font-medium text-ink-900">{row.requiredDisplay}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-500">Have</dt>
              <dd className="font-medium text-ink-900">{row.availableDisplay}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-500">Missing</dt>
              <dd className="font-medium text-ink-900">{row.shortageDisplay ?? "None"}</dd>
            </div>
          </dl>
        )}

        <p className="-mt-2 text-[13px] leading-5 text-ink-500">{row.roleHint}</p>

        <div role="group" aria-label={`Do you have ${row.name}?`} className="flex gap-2">
          {quantified ? (
            <>
              <Choice pressed={haveEnoughPressed} onClick={setHaveEnough}>
                Have enough
              </Choice>
              <Choice pressed={haveSomePressed} onClick={setHaveSome}>
                Have some
              </Choice>
            </>
          ) : (
            <Choice pressed={entry?.have === true} onClick={setHaveEnough}>
              Have it
            </Choice>
          )}
          <Choice pressed={dontHavePressed} onClick={setDontHave}>
            Don&apos;t have
          </Choice>
        </div>

        {showAmount && (
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-[14px] font-medium text-ink-900">
              How much do you have?
            </label>
            <div className="flex gap-2">
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="0"
                value={entry?.qtyText ?? ""}
                aria-invalid={Boolean(row.inputError)}
                aria-describedby={row.inputError ? errorId : undefined}
                onChange={(e) =>
                  onChange({
                    have: true,
                    qtyText: e.target.value,
                    unit: entry?.unit ?? row.requiredUnit,
                  })
                }
                className={`${fieldClasses} tnum !w-auto min-w-0 flex-1 bg-white`}
              />
              <select
                aria-label={`Unit for ${row.name}`}
                value={entry?.unit ?? row.requiredUnit ?? ""}
                onChange={(e) =>
                  onChange({
                    have: true,
                    qtyText: entry?.qtyText ?? "",
                    unit: e.target.value,
                  })
                }
                className={`${fieldClasses} !w-28 shrink-0 bg-white`}
              >
                {unitChoices(row.requiredUnit).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            {row.inputError && (
              <p id={errorId} role="alert" className="text-[13px] font-medium text-error-700">
                {row.inputError}
              </p>
            )}
            {!row.inputError && row.state === "needs-review" && entry?.qtyText.trim() === "" && (
              <p className="text-[13px] text-ink-500">
                Enter an amount so we can compare it with {row.requiredDisplay}.
              </p>
            )}
            {!row.inputError &&
              row.state === "needs-review" &&
              entry !== null &&
              entry.qtyText.trim() !== "" && (
                <p className="text-[13px] text-ink-500">
                  {entry.unit} can&apos;t be compared with {row.requiredUnit} without a verified
                  conversion. Use {row.requiredUnit}, or check this one yourself.
                </p>
              )}
          </div>
        )}

        {row.state === "alternative" && row.substitutedBy && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] text-ink-900">
              Using <span className="font-medium">{row.substitutedBy}</span>
            </p>
            <button
              type="button"
              onClick={onClearSubstitution}
              className="min-h-[44px] rounded-full px-4 text-[14px] font-medium text-ink-900 hover:bg-white"
            >
              Undo
            </button>
          </div>
        )}

        {row.state === "missing" && row.role === "substitutable" && alternativeNames.length > 0 && (
          <button
            type="button"
            onClick={onOpenAlternatives}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-medium text-ink-900 hover:bg-surface-200"
          >
            <ArrowLeftRight aria-hidden size={18} strokeWidth={1.75} />
            Approved alternative: {alternativeNames.join(", ")}
          </button>
        )}
      </div>
    </li>
  );
}

/** Exposed for tests that want the same parsing the row uses. */
export { parseQuantityText };
