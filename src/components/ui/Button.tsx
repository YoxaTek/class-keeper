import type { ButtonHTMLAttributes } from "react";
import { buttonClass } from "./styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  rounded?: "md" | "full";
}

export function Button({ variant = "secondary", size = "md", rounded = "md", className, ...props }: ButtonProps) {
  return <button className={`${buttonClass(variant, size, rounded)} ${className ?? ""}`} {...props} />;
}
