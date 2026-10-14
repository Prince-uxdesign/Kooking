"use client";

import { Info } from "lucide-react";
import type { KitchenCheckRow } from "@/shared/domain/kitchen-check";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Button } from "@/shared/ui/Button";

/**
 * Lists only what the recipe itself approves: named substitutes for a
 * swappable line, and lines the rules allow leaving out. Nothing here
 * is suggested by the UI.
 */
export function AlternativesSheet({
  open,
  onClose,
  rows,
  names,
  onUseSubstitute,
}: {
  open: boolean;
  onClose: () => void;
  rows: KitchenCheckRow[];
  names: Record<string, string>;
  onUseSubstitute: (lineId: string, substituteId: string) => void;
}) {
  const swappable = rows.filter(
    (r) => r.role === "substitutable" && (r.state === "missing" || r.state === "alternative"),
  );
  const unavailable = rows.filter(
    (r) =>
      (r.state === "missing" || r.state === "not-enough") &&
      r.isBlocking &&
      r.approvedSubstitutes.length === 0,
  );
  const omittable = rows.filter(
    (r) => !r.isBlocking && (r.state === "optional" || r.state === "not-checked"),
  );
  const nothingMissing =
    swappable.length === 0 &&
    unavailable.length === 0 &&
    omittable.every((r) => r.state !== "optional");

  return (
    <BottomSheet
      title="Check alternatives"
      open={open}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose} className="w-full">
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-6 text-left">
        {nothingMissing && (
          <p className="rounded-2xl bg-surface-100 p-4 text-[0.9375rem] leading-6 text-ink-600">
            Nothing is marked missing yet, so there is nothing to swap. Mark what you don&apos;t
            have and approved alternatives will appear here.
          </p>
        )}

        {swappable.length > 0 && (
          <section aria-labelledby="alt-swap" className="flex flex-col gap-3">
            <h3 id="alt-swap" className="text-[1.0625rem] font-semibold text-ink-900">
              Approved swaps
            </h3>
            <ul className="flex flex-col gap-3">
              {swappable.map((row) => (
                <li key={row.lineId} className="rounded-2xl bg-surface-100 p-4">
                  <p className="text-[0.9375rem] text-ink-900">
                    Instead of <span className="font-medium">{row.name}</span>
                  </p>
                  {row.constraint && (
                    <p className="mt-1 text-[0.8125rem] leading-5 text-ink-500">{row.constraint}</p>
                  )}
                  <div className="mt-3 flex flex-col gap-2">
                    {row.approvedSubstitutes.map((id) => {
                      const label = names[id] ?? id;
                      const active = row.substitutedBy === label;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => onUseSubstitute(row.lineId, id)}
                          className={`min-h-[48px] rounded-full px-5 text-[0.9375rem] font-medium transition-colors ${
                            active
                              ? "bg-primary-500 text-ink-900"
                              : "bg-white text-ink-900 hover:bg-surface-200"
                          }`}
                        >
                          {active ? `Using ${label}` : `Use ${label}`}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {unavailable.length > 0 && (
          <section aria-labelledby="alt-none" className="flex flex-col gap-3">
            <h3 id="alt-none" className="text-[1.0625rem] font-semibold text-ink-900">
              No approved alternative
            </h3>
            <ul className="flex flex-col gap-2">
              {unavailable.map((row) => (
                <li key={row.lineId} className="flex gap-3 rounded-2xl bg-surface-100 p-4">
                  <Info aria-hidden size={18} className="mt-0.5 shrink-0 text-ink-600" />
                  <p className="text-[0.875rem] leading-5 text-ink-700">
                    <span className="font-medium text-ink-900">{row.name}</span> has no approved
                    alternative in this recipe and can&apos;t be left out. It will need to be
                    bought.
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {omittable.length > 0 && (
          <section aria-labelledby="alt-omit" className="flex flex-col gap-3">
            <h3 id="alt-omit" className="text-[1.0625rem] font-semibold text-ink-900">
              Can be left out
            </h3>
            <ul className="flex flex-col gap-2">
              {omittable.map((row) => (
                <li key={row.lineId} className="rounded-2xl bg-surface-100 p-4">
                  <p className="text-[0.9375rem] text-ink-900">
                    {row.name}{" "}
                    <span className="text-[0.8125rem] text-ink-500">
                      ({row.roleLabel.toLowerCase()})
                    </span>
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-5 text-ink-500">{row.roleHint}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
