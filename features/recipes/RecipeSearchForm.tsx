"use client";

import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { searchHref } from "@/shared/domain/discovery";

/**
 * Home search pill. Hands the query to Explore (/recipes?q=), where
 * live search and filters take over. A plain GET form
 * underneath, so it still works before JavaScript loads.
 */
export function RecipeSearchForm() {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(searchHref(query));
  }

  return (
    <form role="search" action="/recipes" method="get" onSubmit={onSubmit} className="w-full">
      <label htmlFor={inputId} className="sr-only">
        Search recipes or ingredients
      </label>
      <div className="relative flex items-center rounded-full border border-transparent bg-surface-100 transition-colors focus-within:border-ink-900 focus-within:bg-white">
        <Search
          aria-hidden
          size={20}
          className="pointer-events-none absolute left-5 text-ink-900"
        />
        <input
          id={inputId}
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for recipes"
          className="min-h-[60px] w-full min-w-0 rounded-full bg-transparent pl-[52px] pr-2 text-[1rem] text-ink-900 placeholder:text-ink-500 focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="mr-1.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500 text-ink-900 hover:bg-primary-600"
        >
          <ArrowRight aria-hidden size={20} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
