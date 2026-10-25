"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ForkLogo } from "@/shared/ui/Logo";

const LINKS = [
  { id: "how", label: "How it works" },
  { id: "try", label: "Kitchen Check" },
  { id: "stories", label: "Stories" },
  { id: "cooking", label: "Cooking Mode" },
  { id: "faq", label: "FAQ" },
];

/**
 * Top bar. The centre pill tracks the section in view with a white
 * marker that slides between links (colour + position only).
 */
export function LandingNav() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    // Active = the last section whose top has passed 40% of the viewport.
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
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

  return (
    <header
      className={`safe-top sticky top-0 z-40 border-b bg-surface-50/85 backdrop-blur-md transition-colors duration-300 ${
        scrolled ? "border-line-default" : "border-transparent"
      }`}
    >
      <nav
        aria-label="Landing"
        className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10"
      >
        <Link
          href="#top"
          aria-label="Fork, back to top"
          className="inline-flex min-h-[44px] items-center rounded-full"
        >
          <ForkLogo size={30} />
        </Link>

        <ul ref={listRef} className="relative hidden items-center lg:flex">
          <span
            aria-hidden
            className="absolute inset-y-0 rounded-full bg-ink-900/[0.05] transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{
              left: marker?.left ?? 0,
              width: marker?.width ?? 0,
              opacity: marker ? 1 : 0,
            }}
          />
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                data-id={l.id}
                aria-current={active === l.id ? "true" : undefined}
                className={`relative inline-flex h-9 items-center rounded-full px-3.5 text-[0.9375rem] transition-colors ${
                  active === l.id ? "text-ink-900" : "text-ink-500 hover:text-ink-900"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="group inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-ink-900 py-2 pl-4 pr-3 text-[0.875rem] font-medium text-white transition-colors hover:bg-ink-800"
        >
          Open the app
          <ArrowUpRight
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </nav>
    </header>
  );
}
