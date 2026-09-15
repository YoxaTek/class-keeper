import type { ButtonHTMLAttributes } from "react";
import { buttonClass } from "./styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return <button className={`${buttonClass(variant, size)} ${className ?? ""}`} {...props} />;
}
