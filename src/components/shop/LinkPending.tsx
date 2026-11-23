"use client";

import { useLinkStatus } from "next/link";

/**
 * Tiny pulsing dot inside a <Link> while its page is loading, so a tap on a
 * filter or sort option gets instant feedback. Must be rendered inside a Link.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle transition-opacity duration-200 ${pending ? "animate-pulse opacity-100" : "opacity-0"}`} />
  );
}
