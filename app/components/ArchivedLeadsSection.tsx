"use client";

import { useState, ReactNode } from "react";

interface ArchivedLeadsSectionProps {
  count: number;
  children: ReactNode;
}

export default function ArchivedLeadsSection({ count, children }: ArchivedLeadsSectionProps) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>&#9654;</span>
        Archived ({count})
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
