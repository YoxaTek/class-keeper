"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function TermSelector({
  terms,
  currentTermId,
}: {
  terms: { id: string; label: string }[];
  currentTermId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function onChange(nextTermId: string) {
    // Preserve the current sub-page (roster, grid, …) when switching terms,
    // e.g. /terms/A/grid -> /terms/B/grid.
    const next = pathname.replace(/^\/terms\/[^/]+/, `/terms/${nextTermId}`);
    router.push(next);
  }

  return (
    <div className="relative flex items-center">
      <select
        value={currentTermId}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-md bg-transparent py-1 pl-2 pr-6 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus:outline-none dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {terms.map((term) => (
          <option key={term.id} value={term.id} className="text-zinc-900">
            {term.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1 h-3.5 w-3.5 text-zinc-400" aria-hidden />
    </div>
  );
}
