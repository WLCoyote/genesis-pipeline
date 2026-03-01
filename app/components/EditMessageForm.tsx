"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FollowUpEvent } from "@/lib/types";

interface EditMessageFormProps {
  event: FollowUpEvent;
  onClose: () => void;
}

export default function EditMessageForm({ event, onClose }: EditMessageFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(event.content || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("Message content cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/follow-up-events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save changes.");
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  };

  const scheduledAt = event.scheduled_at
    ? new Date(event.scheduled_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-[12px] text-ds-text-lt dark:text-gray-400">
        This {event.channel} is scheduled to send at{" "}
        <span className="font-bold text-ds-text dark:text-gray-300">{scheduledAt}</span>. Edit the content
        below before it auto-sends.
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full px-3 py-2.5 border-[1.5px] border-ds-border dark:border-gray-600 rounded-lg text-[13px] bg-ds-bg dark:bg-gray-700 text-ds-text dark:text-gray-100 focus:border-ds-blue focus:bg-white dark:focus:bg-gray-600 outline-none transition-colors"
      />

      {error && <p className="text-[12px] text-ds-red dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-[7px] bg-ds-blue text-white text-[13px] font-bold rounded-[7px] shadow-[0_3px_10px_rgba(21,101,192,0.3)] hover:bg-ds-blue-lt disabled:opacity-50 transition-colors cursor-pointer border-none"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-[7px] text-[13px] text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200 transition-colors cursor-pointer bg-transparent border-none"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
