"use client";

import { ArrowUpRight, CookingPot } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buttonClasses } from "@/shared/ui/Button";

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
      className={`safe-top sticky top-0 z-40 border-b bg-white transition-colors duration-300 ${
        scrolled ? "border-line-default" : "border-transparent"
      }`}
    >
      <nav
        aria-label="Landing"
        className={`mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-5 transition-[height] duration-300 sm:px-6 lg:px-10 ${
          scrolled ? "h-16" : "h-20"
        }`}
      >
        <Link
          href="#top"
          aria-label="Kooking, back to top"
          className="inline-flex min-h-[44px] items-center gap-2.5 rounded-full"
        >
          <span
            aria-hidden
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-ink-900"
          >
            <CookingPot size={20} strokeWidth={2} />
          </span>
          <span className="text-[1.3rem] font-extrabold tracking-[-0.03em]">Kooking</span>
        </Link>

        <ul ref={listRef} className="relative hidden items-center gap-1 lg:flex">
          <span
            aria-hidden
            className="absolute -bottom-0.5 h-[3px] rounded-full bg-primary-500 transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{
              left: (marker?.left ?? 0) + 14,
              width: Math.max(0, (marker?.width ?? 0) - 28),
              opacity: marker ? 1 : 0,
            }}
          />
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                data-id={l.id}
                aria-current={active === l.id ? "true" : undefined}
                className={`relative inline-flex h-10 items-center rounded-full px-3.5 text-[0.9375rem] font-medium transition-colors ${
                  active === l.id ? "text-ink-900" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <Link href="/" className={buttonClasses({ variant: "dark", className: "group gap-1.5" })}>
          Start cooking
          <ArrowUpRight
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </nav>
    </header>
  );
}
