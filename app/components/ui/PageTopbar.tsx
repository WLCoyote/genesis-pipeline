import type { ReactNode } from "react";

interface PageTopbarProps {
  title: string;
  subtitle?: string | ReactNode;
  children?: ReactNode;
  sticky?: boolean;
}

export default function PageTopbar({ title, subtitle, children, sticky }: PageTopbarProps) {
  const layoutCls = sticky
    ? "shrink-0"
    : "-mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-5";

  return (
    <div
      className={`bg-ds-card dark:bg-gray-800 border-b border-ds-border dark:border-gray-700 px-7 flex items-center justify-between h-14 ${layoutCls}`}
    >
      <div className="flex items-center gap-3">
        <h1 className="font-display text-[22px] font-semibold uppercase tracking-[1px] text-ds-text dark:text-gray-100">
          {title}
        </h1>
        {subtitle && (
          typeof subtitle === "string" ? (
            <span className="text-[12px] text-ds-gray-lt dark:text-gray-500">{subtitle}</span>
          ) : (
            subtitle
          )
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
