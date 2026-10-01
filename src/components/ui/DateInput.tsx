"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { inputClass } from "./styles";
import f from "./form.module.scss";
import s from "./DateInput.module.scss";

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
    <div className={`${f.control} ${f.minW0}`}>
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
        className={`${inputClass} ${s.input} ${className ?? ""}`}
      />
      <CalendarDays
        className={`${f.iconEnd} ${s.icon}`}
        aria-hidden
      />
    </div>
  );
}
