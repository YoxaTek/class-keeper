"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { inputClass } from "./styles";

/**
 * A date input where clicking anywhere in the field opens the native
 * calendar picker — not just the small built-in icon at the field's edge.
 */
export function DateInput({
  value,
  onChange,
  required,
  className,
  id,
  min,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
  min?: string;
  max?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function openPicker() {
    ref.current?.showPicker?.();
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        type="date"
        required={required}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className={`date-input ${inputClass} cursor-pointer pr-8 [color-scheme:light] dark:[color-scheme:dark] ${className ?? ""}`}
      />
      <CalendarDays
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
    </div>
  );
}
