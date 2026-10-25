"use client";

import { Search, X } from "lucide-react";
import { useId } from "react";

interface SearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  /** Visually hide the label (it stays for screen readers). */
  hideLabel?: boolean;
}

/** Pill search field with label, icon, and clear action. */
export function SearchInput({
  label,
  value,
  onChange,
  placeholder = "Search recipes…",
  id,
  hideLabel = false,
}: SearchInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : "text-sm font-medium text-ink-900"}
      >
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-900"
        />
        <input
          id={inputId}
          type="search"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="card-edge min-h-[56px] w-full rounded-full border border-transparent bg-white pl-12 pr-12 text-[1rem] text-ink-900 placeholder:text-ink-500 transition-colors focus:border-ink-900 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 hover:bg-surface-200"
          >
            <X aria-hidden size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
