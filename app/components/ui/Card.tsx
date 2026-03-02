import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  headerRight?: ReactNode;
  padding?: string;
  highlight?: string;
  className?: string;
  children: ReactNode;
}

export default function Card({
  title,
  headerRight,
  padding = "p-5",
  highlight,
  className = "",
  children,
}: CardProps) {
  const borderCls = highlight || "border-ds-border dark:border-gray-700";

  return (
    <div
      className={`bg-ds-card dark:bg-gray-800 border ${borderCls} rounded-xl shadow-sm overflow-hidden ${className}`.trim()}
    >
      {title && (
        <div className="px-5 py-3 border-b border-ds-border dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold uppercase tracking-[2px] text-ds-text dark:text-gray-100">
            {title}
          </h3>
          {headerRight}
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  );
}
