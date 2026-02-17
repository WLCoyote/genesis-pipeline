"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UpdateEstimatesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleUpdate = async () => {
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/admin/update-estimates", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        const parts: string[] = [];
        if (data.new_estimates > 0) parts.push(`${data.new_estimates} new`);
        if (data.updated > 0) parts.push(`${data.updated} updated`);
        if (data.won > 0) parts.push(`${data.won} won`);
        if (data.lost > 0) parts.push(`${data.lost} lost`);
        setResult(
          parts.length > 0 ? `Found: ${parts.join(", ")}` : "No changes detected"
        );
        router.refresh();
      } else {
        setResult(data.error || "Update failed");
      }
    } catch {
      setResult("Failed to connect");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleUpdate}
        disabled={loading}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading ? "Updating..." : "Update Estimates"}
      </button>
      {result && (
        <span
          className={`text-sm ${
            result.includes("Failed") || result.includes("failed")
              ? "text-red-600"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {result}
        </span>
      )}
    </div>
  );
}
