"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";

interface ConversationThreadProps {
  estimateId: string;
  customerId: string;
  customerPhone: string | null;
  initialMessages: Message[];
}

export default function ConversationThread({
  estimateId,
  customerId,
  customerPhone,
  initialMessages,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${estimateId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `estimate_id=eq.${estimateId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [estimateId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reply.trim() || !customerPhone) return;

    setSending(true);
    setError(null);

    const res = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: customerPhone,
        message: reply.trim(),
        customer_id: customerId,
        estimate_id: estimateId,
      }),
    });

    if (res.ok) {
      setReply("");
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || data?.details || "Failed to send message");
    }

    setSending(false);
  };

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl shadow-ds overflow-hidden">
      {/* Card header */}
      <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-3 flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-[2px] text-ds-text dark:text-gray-100 flex items-center gap-2">
          <span>💬</span> SMS Conversation
        </div>
        {customerPhone && (
          <span className="text-[11px] text-ds-gray-lt dark:text-gray-500">{customerPhone}</span>
        )}
      </div>

      {!customerPhone ? (
        <div className="p-4.5">
          <p className="text-[13px] text-ds-gray-lt dark:text-gray-500">
            No phone number on file for this customer.
          </p>
        </div>
      ) : (
        <>
          <div className="h-64 overflow-y-auto space-y-2 p-4 bg-ds-bg dark:bg-gray-700/50">
            {messages.length === 0 ? (
              <p className="text-[13px] text-ds-gray-lt dark:text-gray-500 text-center py-8 italic">
                No messages yet.
              </p>
            ) : (
              messages
                .sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
                )
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === "outbound"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-xl text-[13px] ${
                        msg.direction === "outbound"
                          ? "bg-ds-blue text-white"
                          : "bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-600 text-ds-text dark:text-gray-100"
                      }`}
                    >
                      <p>{msg.body}</p>
                      <p
                        className={`text-[11px] mt-1 ${
                          msg.direction === "outbound"
                            ? "text-blue-200"
                            : "text-ds-gray-lt dark:text-gray-500"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-ds-border dark:border-gray-700">
            <form onSubmit={handleSend} className="flex gap-2.5 p-3">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1 px-3.5 py-2.5 border-[1.5px] border-ds-border dark:border-gray-600 rounded-lg text-[13px] text-ds-text dark:text-gray-100 bg-ds-bg dark:bg-gray-700 placeholder:text-ds-gray-lt focus:border-ds-blue focus:bg-white dark:focus:bg-gray-600 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="px-5 py-0 bg-ds-blue text-white border-none rounded-lg font-bold text-[13px] hover:bg-ds-blue-lt disabled:opacity-50 transition-colors cursor-pointer"
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
            {error && (
              <p className="text-[12px] text-ds-red dark:text-red-400 px-3 pb-3 -mt-1">{error}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
