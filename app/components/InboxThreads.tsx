"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/lib/types";

interface Thread {
  phone_number: string;
  messages: Message[];
  last_message_at: string;
  message_count: number;
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InboxThreads() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedThread = threads.find((t) => t.phone_number === selectedPhone);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedThread?.messages.length]);

  async function fetchThreads() {
    setLoading(true);
    const res = await fetch("/api/inbox");
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads);
    }
    setLoading(false);
  }

  async function handleReply() {
    if (!selectedPhone || !replyText.trim()) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: selectedPhone, message: replyText }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to send");
    } else {
      setReplyText("");
      // Refresh threads to show the sent message
      await fetchThreads();
    }
    setSending(false);
  }

  async function handleDismiss() {
    if (!selectedPhone) return;
    setDismissing(true);

    const res = await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: selectedPhone }),
    });

    if (res.ok) {
      setSelectedPhone(null);
      await fetchThreads();
    }
    setDismissing(false);
  }

  function handleConvertToLead() {
    if (!selectedPhone) return;
    // Navigate to leads page with the phone number pre-filled via query param
    router.push(`/dashboard/leads?phone=${encodeURIComponent(selectedPhone)}`);
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
        Loading inbox...
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No unmatched messages. All clear!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-[500px]">
      {/* Thread list */}
      <div className="w-full md:w-80 shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Threads ({threads.length})
            </span>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {threads.map((thread) => {
              const lastMsg = thread.messages[thread.messages.length - 1];
              const isSelected = selectedPhone === thread.phone_number;
              return (
                <button
                  key={thread.phone_number}
                  onClick={() => {
                    setSelectedPhone(thread.phone_number);
                    setError("");
                    setReplyText("");
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPhone(thread.phone_number)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {timeAgo(thread.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {lastMsg.direction === "outbound" ? "You: " : ""}
                    {lastMsg.body}
                  </p>
                  {thread.message_count > 1 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {thread.message_count} messages
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversation view */}
      <div className="flex-1">
        {!selectedThread ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center h-full flex items-center justify-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Select a thread to view the conversation
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full min-h-[500px]">
            {/* Thread header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatPhone(selectedThread.phone_number)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                  {selectedThread.message_count} message
                  {selectedThread.message_count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConvertToLead}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Convert to Lead
                </button>
                <button
                  onClick={handleDismiss}
                  disabled={dismissing}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {dismissing ? "Dismissing..." : "Dismiss"}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedThread.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.direction === "outbound" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      msg.direction === "outbound"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.direction === "outbound"
                          ? "text-blue-200"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              {error && (
                <p className="text-xs text-red-600 mb-2">{error}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                  placeholder="Type a reply..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
