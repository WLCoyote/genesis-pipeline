"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ConversationThread {
  estimate_id: string;
  estimate_number: string;
  customer_name: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
}

interface MobileInboxListProps {
  threads: ConversationThread[];
  userId: string;
}

const AVATAR_COLORS = [
  "from-[#1565c0] to-[#1e88e5]",
  "from-[#2e7d32] to-[#43a047]",
  "from-[#e65100] to-[#ff6d00]",
  "from-[#6a1b9a] to-[#9c27b0]",
  "from-[#00695c] to-[#00897b]",
  "from-[#c62828] to-[#e53935]",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function MobileInboxList({
  threads: initialThreads,
  userId,
}: MobileInboxListProps) {
  const router = useRouter();
  const [threads, setThreads] =
    useState<ConversationThread[]>(initialThreads);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter(
      (t) =>
        t.customer_name.toLowerCase().includes(q) ||
        t.estimate_number.toLowerCase().includes(q)
    );
  }, [threads, search]);

  const unreadCount = threads.filter((t) => t.unread).length;

  // Realtime: update thread when new message arrives
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`m-inbox:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (!msg.estimate_id) return;
          setThreads((prev) => {
            const exists = prev.some(
              (t) => t.estimate_id === msg.estimate_id
            );
            if (!exists) return prev;
            return prev
              .map((t) =>
                t.estimate_id === msg.estimate_id
                  ? {
                      ...t,
                      last_message: msg.body,
                      last_message_at: msg.created_at,
                      unread: msg.direction === "inbound",
                    }
                  : t
              )
              .sort(
                (a, b) =>
                  new Date(b.last_message_at).getTime() -
                  new Date(a.last_message_at).getTime()
              );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-lg font-semibold text-ds-text dark:text-gray-100">
          Conversations
        </h1>
        {unreadCount > 0 && (
          <span className="text-xs font-semibold text-ds-blue">
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by name or estimate #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-ds-text dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ds-blue/30"
        />
      </div>

      {/* Thread list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            {search
              ? "No matching conversations."
              : "No conversations yet."}
          </div>
        ) : (
          filtered.map((thread) => (
            <button
              key={thread.estimate_id}
              onClick={() =>
                router.push(`/m/estimates/${thread.estimate_id}`)
              }
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 active:bg-gray-50 dark:active:bg-gray-700/50 text-left cursor-pointer"
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                  thread.customer_name
                )} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-white text-xs font-bold">
                  {getInitials(thread.customer_name)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm truncate ${
                      thread.unread
                        ? "font-semibold text-ds-text dark:text-gray-100"
                        : "font-normal text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {thread.customer_name}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {timeAgo(thread.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xs truncate flex-1 ${
                      thread.unread
                        ? "text-gray-600 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {thread.last_message}
                  </p>
                  {thread.unread && (
                    <span className="w-2 h-2 rounded-full bg-ds-blue flex-shrink-0" />
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
