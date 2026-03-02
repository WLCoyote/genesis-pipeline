"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";

export default function UpdateEstimatesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleUpdate = async () => {
    setLoading(true);
    setResult("");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch("/api/admin/update-estimates", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 504) {
          setResult("Timed out — HCP has too many estimates. Try again.");
        } else {
          const data = await res.json().catch(() => null);
          setResult(data?.error || `Error ${res.status}`);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      const parts: string[] = [];
      if (data.new_estimates > 0) parts.push(`${data.new_estimates} new`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (data.won > 0) parts.push(`${data.won} won`);
      if (data.lost > 0) parts.push(`${data.lost} lost`);
      if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
      if (data.pages_fetched > 0) parts.push(`${data.pages_fetched} pages`);
      setResult(
        parts.length > 0 ? `Found: ${parts.join(", ")}` : "No changes detected"
      );
      router.refresh();
    } catch {
      setResult("Failed to connect — check your internet");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="warning"
        size="sm"
        shadow
        className="border-none shadow-[0_3px_10px_rgba(230,81,0,0.25)]"
        onClick={handleUpdate}
        disabled={loading}
      >
        {loading ? "Updating..." : "Update Estimates"}
      </Button>
      {result && (
        <span
          className={`text-xs ${
            result.includes("Failed") || result.includes("failed") || result.includes("Timed")
              ? "text-ds-red"
              : "text-ds-green dark:text-green-400"
          }`}
        >
          {result}
        </span>
      )}
    </div>
  );
}
