import { createElement, type ReactNode } from "react";

interface SectionHeaderProps {
  as?: "h2" | "h3" | "div";
  className?: string;
  children: ReactNode;
}

export default function SectionHeader({ as = "h3", className = "", children }: SectionHeaderProps) {
  return createElement(
    as,
    {
      className: `font-display text-xs font-semibold uppercase tracking-[2px] text-ds-text dark:text-gray-100 ${className}`.trim(),
    },
    children
  );
}
