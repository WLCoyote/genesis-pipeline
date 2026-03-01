"use client";

import type { PricebookItem, PricebookCategoryRow, PricebookCategory } from "@/lib/types";

interface PricebookCategoryTabsProps {
  categories: PricebookCategoryRow[];
  items: PricebookItem[];
  activeCategory: PricebookCategory | "all";
  onCategoryChange: (cat: PricebookCategory | "all") => void;
  onAddCategory: () => void;
}

export default function PricebookCategoryTabs({
  categories,
  items,
  activeCategory,
  onCategoryChange,
  onAddCategory,
}: PricebookCategoryTabsProps) {
  const activeItems = items.filter((i) => i.is_active);
  const getCategoryCount = (slug: string) =>
    activeItems.filter((i) => i.category === slug).length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      <button
        onClick={() => onCategoryChange("all")}
        className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-full transition-all ${
          activeCategory === "all"
            ? "bg-ds-blue text-white shadow-ds"
            : "bg-ds-card dark:bg-gray-800 text-ds-text-lt dark:text-gray-400 border border-ds-border dark:border-gray-700 hover:border-ds-blue/40 hover:text-ds-blue"
        }`}
      >
        All
        <span className={`ml-1.5 text-[11px] ${activeCategory === "all" ? "text-white/70" : "text-ds-gray-lt dark:text-gray-500"}`}>
          {activeItems.length}
        </span>
      </button>

      {categories.map((cat) => {
        const count = getCategoryCount(cat.slug);
        return (
          <button
            key={cat.slug}
            onClick={() => onCategoryChange(cat.slug)}
            className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-full transition-all ${
              activeCategory === cat.slug
                ? "bg-ds-blue text-white shadow-ds"
                : "bg-ds-card dark:bg-gray-800 text-ds-text-lt dark:text-gray-400 border border-ds-border dark:border-gray-700 hover:border-ds-blue/40 hover:text-ds-blue"
            }`}
          >
            {cat.name}
            <span className={`ml-1.5 text-[11px] ${activeCategory === cat.slug ? "text-white/70" : "text-ds-gray-lt dark:text-gray-500"}`}>
              {count}
            </span>
          </button>
        );
      })}

      <button
        onClick={onAddCategory}
        className="w-7 h-7 flex items-center justify-center text-sm rounded-full bg-ds-card dark:bg-gray-800 text-ds-gray-lt dark:text-gray-500 border border-ds-border dark:border-gray-700 hover:border-ds-blue/40 hover:text-ds-blue transition-all"
        title="Add category"
      >
        +
      </button>
    </div>
  );
}
