"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FollowUpEvent } from "@/lib/types";
import Button from "@/app/components/ui/Button";

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
        <Button
          type="submit"
          variant="primary"
          size="sm"
          shadow
          className="border-none"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-ds-gray hover:text-ds-text dark:text-gray-400 dark:hover:text-gray-200 border-none"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
