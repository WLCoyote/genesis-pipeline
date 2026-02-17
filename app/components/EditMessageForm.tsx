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
      <div className="text-sm text-gray-500 dark:text-gray-400">
        This {event.channel} is scheduled to send at{" "}
        <span className="font-medium">{scheduledAt}</span>. Edit the content
        below before it auto-sends.
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
