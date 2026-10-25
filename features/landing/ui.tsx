import { ArrowRight } from "lucide-react";
import { AppLink as Link } from "./launch";
import type { ReactNode } from "react";
import { Reveal } from "./motion";

/**
 * Landing building blocks. The page is drawn on a ruled sheet: a centred
 * column with hairline rails, each band opening on a full-width hairline
 * with a node where the lines cross.
 */

function Node({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={`absolute -top-[4px] hidden h-[7px] w-[7px] rounded-full border border-line-strong bg-surface-50 md:block ${
        side === "left" ? "-left-[4px]" : "-right-[4px]"
      }`}
    />
  );
}

export function Band({
  id,
  labelledBy,
  label,
  className = "",
  innerClassName = "",
  rule = true,
  flush = false,
  children,
}: {
  id?: string;
  labelledBy?: string;
  label?: string;
  className?: string;
  innerClassName?: string;
  /** Hairline + nodes along the top edge. */
  rule?: boolean;
  /** Drop the column's side padding (content runs rail to rail). */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      aria-label={label}
      className={`relative md:px-8 lg:px-10 ${rule ? "border-t border-line-default" : ""} ${className}`}
    >
      <div
        className={`relative mx-auto max-w-[1200px] md:border-x md:border-line-default ${
          flush ? "" : "px-5 sm:px-8 lg:px-14"
        } ${innerClassName}`}
      >
        {rule && (
          <>
            <Node side="left" />
            <Node side="right" />
          </>
        )}
        {children}
      </div>
    </section>
  );
}

/** Section label: a short rule over a small uppercase line. */
export function Eyebrow({
  children,
  tone = "pepper",
}: {
  children: ReactNode;
  tone?: "pepper" | "leaf" | "ink" | "night";
}) {
  const tones = {
    pepper: "text-primary-700",
    leaf: "text-success-700",
    ink: "text-ink-600",
    night: "text-white/80",
  } as const;
  return (
    <span
      className={`eyebrow inline-flex flex-col items-start gap-2.5 font-label text-[0.75rem] font-semibold uppercase leading-none tracking-[0.08em] ${tones[tone]}`}
    >
      <span aria-hidden className="h-px w-16 bg-current opacity-40" />
      {children}
    </span>
  );
}

/** Label that rolls up to a copy of itself when its `group` parent is hovered. */
export function Roll({ children }: { children: ReactNode }) {
  return (
    <span className="roll relative inline-flex overflow-hidden">
      <span>{children}</span>
      <span aria-hidden className="absolute inset-x-0 top-full">
        {children}
      </span>
    </span>
  );
}

/** Inline tinted highlight for a few words inside running text. */
export function Mark({
  children,
  tone = "pepper",
}: {
  children: ReactNode;
  tone?: "pepper" | "leaf";
}) {
  return (
    <span
      className={`rounded-[6px] px-1 py-px [box-decoration-break:clone] ${
        tone === "pepper" ? "bg-primary-50 text-primary-700" : "bg-success-100/70 text-success-700"
      }`}
    >
      {children}
    </span>
  );
}

/** Mono index chip: 1.1, 2.3, 04… */
export function Index({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-md px-1.5 font-mono text-[0.75rem] tnum ${
        dark ? "bg-white/[0.08] text-white/70" : "bg-ink-900/[0.045] text-ink-500"
      }`}
    >
      {children}
    </span>
  );
}

/** Section title block. Centred by default; `align="left"` for split layouts. */
export function SectionHead({
  id,
  eyebrow,
  title,
  tail,
  lead,
  align = "center",
  dark = false,
  className = "",
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  /** Second clause, set in a quieter tone on the same line (two-tone heading). */
  tail?: ReactNode;
  lead?: ReactNode;
  align?: "center" | "left";
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-5 ${
        align === "center"
          ? "mx-auto max-w-[760px] items-center text-center [&>.eyebrow]:items-center"
          : "max-w-[640px] items-start"
      } ${className}`}
    >
      {eyebrow}
      <Reveal
        as="h2"
        id={id}
        delay={80}
        className={`heading-rise font-headline text-[2.125rem] font-medium leading-[1.02] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3.25rem] ${
          dark ? "text-white" : "text-ink-900"
        }`}
      >
        {title}
        {tail && <span className={dark ? "text-white/60" : "text-ink-500"}> {tail}</span>}
      </Reveal>
      {lead && (
        <p
          className={`max-w-[560px] text-[1.0625rem] leading-[1.6] sm:text-[1.125rem] ${
            dark ? "text-white/70" : "text-ink-500"
          }`}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

/**
 * Numbered chapter opener: a quiet label on the left, a two-tone heading
 * and a short paragraph on the right.
 */
export function ChapterHead({
  id,
  num,
  label,
  title,
  tail,
  lead,
  dark = false,
}: {
  id: string;
  num: string;
  label: string;
  title: ReactNode;
  tail?: ReactNode;
  lead?: ReactNode;
  dark?: boolean;
}) {
  const quiet = dark ? "text-white/60" : "text-ink-500";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
      <p
        className={`flex items-baseline gap-3 text-[1.375rem] tracking-[-0.01em] sm:text-[1.625rem] ${
          dark ? "text-white" : "text-ink-900"
        }`}
      >
        <span className={`font-mono text-[0.9375rem] tnum ${quiet}`}>{num}</span>
        {label}
      </p>
      <div>
        <Reveal
          as="h2"
          id={id}
          delay={80}
          className={`heading-rise font-headline text-[1.875rem] font-medium leading-[1.06] tracking-[-0.02em] sm:text-[2.375rem] ${
            dark ? "text-white" : "text-ink-900"
          }`}
        >
          {title}
          {tail && (
            <>
              <br className="hidden sm:block" />
              <span className={quiet}> {tail}</span>
            </>
          )}
        </Reveal>
        {lead && (
          <p
            className={`mt-6 max-w-[520px] text-[1.0625rem] leading-[1.65] ${
              dark ? "text-white/60" : "text-ink-500"
            }`}
          >
            {lead}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A desaturated, grainy photograph that product UI floats over.
 * Decorative: the photo carries no meaning, so it has no alt text.
 */
export function GrainStage({
  src,
  children,
  className = "",
  dark = false,
}: {
  src: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`grain relative isolate overflow-hidden rounded-[22px] ${
        dark ? "bg-ink-800" : "bg-surface-200"
      } ${className}`}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 -z-10 h-full w-full object-cover grayscale ${
          dark ? "opacity-40 contrast-125" : "opacity-70 contrast-[1.08] brightness-[1.04]"
        }`}
      />
      {children}
    </div>
  );
}

const ctaTone = {
  dark: "bg-ink-900 text-white hover:bg-ink-800 ring-ink-900/10 ring-offset-surface-50",
  light: "bg-white text-ink-900 hover:bg-surface-100 ring-white/15 ring-offset-ink-900",
  brand: "bg-primary-600 text-white hover:bg-primary-700 ring-primary-600/30 ring-offset-ink-900",
} as const;

/** Black pill with a haloed edge and a small arrow well, the page's one CTA shape. */
export function PillCta({
  href,
  children,
  tone = "dark",
  className = "",
}: {
  href: string;
  children: ReactNode;
  tone?: keyof typeof ctaTone;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex min-h-[48px] items-center justify-center gap-3 rounded-full py-1.5 pl-5 pr-1.5 text-[0.9375rem] font-medium ring-1 ring-offset-[3px] transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97] ${ctaTone[tone]} ${className}`}
    >
      {children}
      <span
        aria-hidden
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          tone === "dark"
            ? "bg-white/[0.12] group-hover:bg-primary-600 group-hover:text-white"
            : tone === "brand"
              ? "bg-white/20 group-hover:bg-white group-hover:text-primary-700"
              : "bg-ink-900/[0.06] group-hover:bg-primary-600 group-hover:text-white"
        }`}
      >
        <ArrowRight
          size={15}
          strokeWidth={2}
          className="transition-transform duration-300 group-hover:translate-x-0.5 group-active:translate-x-1"
        />
      </span>
    </Link>
  );
}

/** Quiet secondary link that sits beside a PillCta. */
export function TextCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-[48px] items-center gap-1.5 rounded-full px-4 text-[0.9375rem] font-medium text-ink-700 transition-[color,scale] duration-150 ease-out hover:text-ink-900 active:scale-[0.97]"
    >
      {children}
      <ArrowRight
        aria-hidden
        size={15}
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
