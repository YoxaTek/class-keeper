import { Loader2 } from "lucide-react";

/** Used as every route segment's loading.tsx fallback — shown instantly on
    navigation while the target page's Server Component data loads, instead
    of the previous page just sitting frozen with no feedback. */
export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400 dark:text-zinc-600" aria-hidden />
    </div>
  );
}
