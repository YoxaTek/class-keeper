import { Loader2 } from "lucide-react";
import s from "./PageSpinner.module.scss";

/** Used as every route segment's loading.tsx fallback — shown instantly on
    navigation while the target page's Server Component data loads, instead
    of the previous page just sitting frozen with no feedback. */
export function PageSpinner() {
  return (
    <div className={s.spinner}>
      <Loader2 aria-hidden />
    </div>
  );
}
