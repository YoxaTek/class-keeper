import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700" aria-hidden />}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-500"}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
