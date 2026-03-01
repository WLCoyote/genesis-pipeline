"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SnoozeFormProps {
  estimateId: string;
  onCancel: () => void;
}

const snoozeOptions = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

export default function SnoozeForm({ estimateId, onCancel }: SnoozeFormProps) {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!note.trim()) {
      setError("A note is required when snoozing.");
      return;
    }

    setLoading(true);
    setError("");

    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);

    const res = await fetch(`/api/estimates/${estimateId}/snooze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snooze_until: snoozeUntil.toISOString(),
        snooze_note: note,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to snooze estimate.");
      setLoading(false);
      return;
    }

    router.refresh();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-[12px] font-bold text-ds-text dark:text-gray-300 mb-1.5">
          Snooze for
        </label>
        <div className="flex flex-wrap gap-1.5">
          {snoozeOptions.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={`px-3 py-1.5 rounded-[7px] text-[12px] font-bold border transition-colors cursor-pointer ${
                days === opt.days
                  ? "bg-ds-blue text-white border-ds-blue"
                  : "bg-ds-card dark:bg-gray-700 text-ds-text dark:text-gray-300 border-ds-border dark:border-gray-600 hover:border-ds-blue"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-bold text-ds-text dark:text-gray-300 mb-1.5">
          Note <span className="text-ds-red">*</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why are you snoozing this estimate?"
          rows={2}
          className="w-full px-3 py-2.5 border-[1.5px] border-ds-border dark:border-gray-600 rounded-lg text-[13px] bg-ds-bg dark:bg-gray-700 text-ds-text dark:text-gray-100 focus:border-ds-blue focus:bg-white dark:focus:bg-gray-600 outline-none transition-colors"
        />
      </div>

      {error && <p className="text-[12px] text-ds-red dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-ds-yellow text-ds-text text-[13px] font-bold rounded-[7px] hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer border-none"
        >
          {loading ? "Snoozing..." : "Snooze"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[13px] text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200 transition-colors cursor-pointer bg-transparent border-none"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
