"use client";

import { useState } from "react";
import type { PricebookItem } from "@/lib/types";
import PricebookTableRow from "./PricebookTableRow";

const ITEMS_PER_PAGE = 50;

interface PricebookTableProps {
  items: PricebookItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (item: PricebookItem) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  /** Reset pagination when filters change (pass a key that changes on filter) */
  filterKey: string;
}

export default function PricebookTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDeactivate,
  onReactivate,
  onToggleFavorite,
  filterKey,
}: PricebookTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setCurrentPage(1);
    setLastFilterKey(filterKey);
  }

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIdx, endIdx);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-ds-gray dark:text-gray-400 text-sm bg-ds-card dark:bg-gray-800 rounded-xl border border-ds-border dark:border-gray-700">
        No pricebook items found.
      </div>
    );
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-ds-card dark:bg-gray-800 rounded-xl border border-ds-border dark:border-gray-700 overflow-hidden shadow-ds">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "40px" }} />
            <col style={{ width: "32px" }} />
            <col />
            <col style={{ width: "120px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "50px" }} />
            <col style={{ width: "140px" }} />
          </colgroup>
          <thead>
            <tr className="bg-ds-bg dark:bg-gray-700/60 border-b border-ds-border dark:border-gray-700">
              <th className="pl-4 pr-2 py-3 w-10">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={onToggleSelectAll}
                  className="rounded border-ds-border dark:border-gray-600"
                />
              </th>
              <th className="w-8 px-1 py-3"></th>
              <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                Name
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                Brand
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                Price
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                Cost
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                Margin
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                Source
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                <span title="Status">●</span>
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-ds-gray dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => (
              <PricebookTableRow
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
                onReactivate={onReactivate}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {paginatedItems.map((item) => {
          const margin =
            item.unit_price && item.cost && item.unit_price > 0
              ? ((item.unit_price - item.cost) / item.unit_price) * 100
              : null;
          return (
            <div
              key={item.id}
              className="bg-ds-card dark:bg-gray-800 rounded-xl border border-ds-border dark:border-gray-700 p-4 shadow-ds"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelect(item.id)}
                    className="rounded mt-1 border-ds-border"
                  />
                  <div>
                    <div className="font-semibold text-ds-text dark:text-gray-100 text-sm">
                      {item.display_name}
                    </div>
                    <div className="text-xs text-ds-gray dark:text-gray-500 mt-0.5">
                      {item.manufacturer || item.category.replace("_", " ")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-ds-text dark:text-gray-300 font-medium">
                  {item.unit_price != null
                    ? `$${item.unit_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : "—"}
                </span>
                {margin != null && (
                  <span
                    className={
                      margin >= 20
                        ? "text-ds-green dark:text-green-400"
                        : margin >= 0
                        ? "text-ds-yellow dark:text-yellow-400"
                        : "text-ds-red dark:text-red-400"
                    }
                  >
                    {margin.toFixed(1)}% margin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => onEdit(item)}
                  className="text-ds-blue dark:text-blue-400 text-sm font-medium hover:underline"
                >
                  Edit
                </button>
                {item.is_active ? (
                  <button
                    onClick={() => onDeactivate(item.id)}
                    className="text-ds-red dark:text-red-400 text-sm font-medium hover:underline"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => onReactivate(item.id)}
                    className="text-ds-green dark:text-green-400 text-sm font-medium hover:underline"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-[13px] text-ds-gray dark:text-gray-400">
            Showing {startIdx + 1}–{Math.min(endIdx, items.length)} of{" "}
            {items.length.toLocaleString()} items
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs rounded-md text-ds-text-lt dark:text-gray-400 hover:bg-ds-card dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹ Prev
            </button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-1 text-ds-gray-lt dark:text-gray-500 text-xs">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 text-xs rounded-md transition-colors ${
                    currentPage === p
                      ? "bg-ds-blue text-white font-semibold"
                      : "text-ds-text-lt dark:text-gray-400 hover:bg-ds-card dark:hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs rounded-md text-ds-text-lt dark:text-gray-400 hover:bg-ds-card dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
