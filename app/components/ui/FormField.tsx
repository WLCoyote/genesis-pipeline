import type { ReactNode } from "react";

/** Shared className constants for form inputs */
export const inputCls =
  "w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100";

export const selectCls =
  "w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100";

export const textareaCls =
  "w-full px-3 py-2 text-sm border border-ds-border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-ds-text dark:text-gray-100";

interface FormFieldProps {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export default function FormField({ label, required, className = "", children }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ds-text-lt dark:text-gray-300 mb-1">
        {label}{required && " *"}
      </label>
      {children}
    </div>
  );
}
