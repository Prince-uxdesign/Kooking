"use client";

import { useEffect, useState } from "react";
import { greetingFor } from "@/shared/domain/discovery";

/**
 * Time-of-day greeting from the device clock. Rendered after mount so
 * server and client never disagree about the hour. Neutral by design:
 * Kooking has no accounts, so it never addresses anyone by name.
 */
export function HomeGreeting() {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  return <p className="min-h-6 text-[1rem] leading-6 text-ink-500">{greeting ?? " "}</p>;
}
