import Link from "next/link";
import { ChevronRight } from "lucide-react";
import s from "./Breadcrumb.module.scss";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className={s.crumbs}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className={s.crumb}>
            {i > 0 && <ChevronRight className={s.chevron} aria-hidden />}
            {item.href && !isLast ? (
              <Link href={item.href} className={s.link}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? s.current : s.label}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
