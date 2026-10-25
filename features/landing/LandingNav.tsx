"use client";

import { ArrowUpRight, LoaderCircle } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ForkLogo } from "@/shared/ui/Logo";
import { Roll } from "./ui";

const LINKS = [
  { id: "how", label: "How it works" },
  { id: "try", label: "Kitchen Check" },
  { id: "stories", label: "Stories" },
  { id: "cooking", label: "Cooking Mode" },
  { id: "faq", label: "FAQ" },
];

/** Shows the click registered while the next page loads. */
function Pending({ children }: { children?: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <LoaderCircle size={15} strokeWidth={2.25} aria-hidden className="ml-2 animate-spin" />
  ) : (
    children
  );
}

/**
 * Floating frosted-glass pill, fixed to the top. The links track the section in
 * view with a marker that slides between them (colour + position only).
 */
export function LandingNav() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    // Active = the last section whose top has passed 40% of the viewport.
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      // Reading progress, written straight to CSS so scrolling never re-renders.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      navRef.current?.style.setProperty("--sp", String(max > 0 ? window.scrollY / max : 0));
      const line = window.innerHeight * 0.4;
      let current: string | null = null;
      for (const { id } of LINKS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      const faq = document.getElementById("faq");
      if (current === "faq" && faq && faq.getBoundingClientRect().bottom < line) current = null;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    const link = active ? list?.querySelector<HTMLElement>(`[data-id="${active}"]`) : null;
    setMarker(link ? { left: link.offsetLeft, width: link.offsetWidth } : null);
  }, [active]);

  const label = "font-label text-[0.8125rem] font-semibold uppercase tracking-[0.06em]";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 sm:pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-8">
      <nav
        ref={navRef}
        aria-label="Landing"
        className={`glass-nav pointer-events-auto relative mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 rounded-full pl-5 pr-2.5 text-ink-900 transition-[background-color,box-shadow] duration-300 sm:pl-7 ${
          scrolled ? "bg-white/75" : "bg-white/60"
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 bottom-0 h-[2px] origin-left scale-x-[var(--sp,0)] rounded-full bg-primary-600"
        />
        <Link
          href="/#top"
          aria-label="Fork, back to top"
          className="inline-flex min-h-[44px] items-center rounded-full"
        >
          <ForkLogo size={28} />
        </Link>

        <ul ref={listRef} className="relative hidden items-center lg:flex">
          <span
            aria-hidden
            className="absolute inset-y-0 rounded-full bg-ink-900/[0.06] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(.23,1,.32,1)]"
            style={{
              left: marker?.left ?? 0,
              width: marker?.width ?? 0,
              opacity: marker ? 1 : 0,
            }}
          />
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`/#${l.id}`}
                data-id={l.id}
                aria-current={active === l.id ? "true" : undefined}
                className={`group relative inline-flex h-9 items-center rounded-full px-3.5 transition-colors ${label} ${
                  active === l.id ? "text-ink-900" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                <Roll>{l.label}</Roll>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <Link
            href="/welcome/recipes"
            className={`group hidden h-11 items-center rounded-full bg-ink-900 px-5 text-white transition-[background-color,scale] duration-150 ease-out hover:bg-ink-800 active:scale-[0.97] sm:inline-flex ${label}`}
          >
            <Roll>Browse recipes</Roll>
            <Pending />
          </Link>
          <Link
            href="/app"
            className={`group inline-flex h-11 items-center gap-1.5 rounded-full bg-primary-600 pl-5 pr-4 text-white transition-[background-color,scale] duration-150 ease-out hover:bg-primary-700 active:scale-[0.97] ${label}`}
          >
            <Roll>Open the app</Roll>
            <Pending>
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
            </Pending>
          </Link>
        </div>
      </nav>
    </header>
  );
}
