"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

const variantCls = {
  primary:
    "bg-ds-blue text-white hover:bg-blue-700 disabled:opacity-50",
  destructive:
    "bg-ds-red text-white hover:bg-red-700 disabled:opacity-50",
  success:
    "bg-ds-green text-white hover:brightness-110 disabled:opacity-50",
  warning:
    "bg-ds-orange text-white hover:bg-[#ff6d00] disabled:opacity-50",
  snooze:
    "bg-ds-yellow text-ds-text hover:brightness-105 disabled:opacity-50",
  secondary:
    "border border-ds-border dark:border-gray-600 text-ds-blue hover:bg-ds-blue-bg hover:border-ds-blue disabled:opacity-50",
  ghost:
    "text-ds-blue bg-transparent hover:text-blue-700 disabled:opacity-50",
} as const;

const sizeCls = {
  xs: "px-3 py-1.5 text-xs rounded-lg",
  sm: "px-3 py-2 text-[12px] rounded-[7px]",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-8 py-3 text-sm rounded-xl",
} as const;

export type ButtonVariant = keyof typeof variantCls;
export type ButtonSize = keyof typeof sizeCls;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shadow?: boolean;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", shadow, className = "", children, ...props }, ref) => {
    const shadowCls = shadow ? "shadow-[0_3px_10px_rgba(21,101,192,0.3)]" : "";

    return (
      <button
        ref={ref}
        className={`font-bold transition-colors cursor-pointer ${variantCls[variant]} ${sizeCls[size]} ${shadowCls} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
