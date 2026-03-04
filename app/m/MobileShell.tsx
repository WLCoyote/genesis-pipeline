"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/app/components/NotificationBell";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/lib/types";

interface MobileShellProps {
  role: UserRole;
  userName: string;
  userId: string;
  children: React.ReactNode;
}

const tabs = [
  {
    id: "pipeline",
    label: "Pipeline",
    href: "/m/pipeline",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: "inbox",
    label: "Inbox",
    href: "/m/inbox",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: "commission",
    label: "Commission",
    href: "/m/commission",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Alerts",
    href: "/m/notifications",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    href: "/m/profile",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function MobileShell({ role, userName, userId, children }: MobileShellProps) {
  const pathname = usePathname();
  const [unreadInbox, setUnreadInbox] = useState(0);

  // Clear "stay on desktop" override when user navigates to mobile app
  useEffect(() => {
    localStorage.removeItem("stay_desktop");
  }, []);

  // Fetch unread conversation count + realtime updates
  const fetchUnread = useCallback(async () => {
    const supabase = createClient();

    let estQuery = supabase.from("estimates").select("id");
    if (role !== "admin") {
      estQuery = estQuery.eq("assigned_to", userId);
    }

    const { data: ests } = await estQuery;
    if (!ests?.length) {
      setUnreadInbox(0);
      return;
    }

    const { data: msgs } = await supabase
      .from("messages")
      .select("estimate_id, direction")
      .in("estimate_id", ests.map((e) => e.id))
      .eq("channel", "sms")
      .order("created_at", { ascending: false })
      .limit(200);

    const seen = new Set<string>();
    let count = 0;
    for (const m of msgs || []) {
      if (!m.estimate_id || seen.has(m.estimate_id)) continue;
      seen.add(m.estimate_id);
      if (m.direction === "inbound") count++;
    }
    setUnreadInbox(count);
  }, [userId, role]);

  useEffect(() => {
    fetchUnread();

    const supabase = createClient();
    const channel = supabase
      .channel(`m-inbox-badge:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnread]);

  const isActive = (href: string) => {
    if (href === "/m/pipeline") {
      return pathname === "/m" || pathname === "/m/pipeline" || pathname.startsWith("/m/estimates");
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      className="flex flex-col h-screen bg-ds-bg"
      style={{ height: "100dvh" }}
    >
      {/* Top header */}
      <header
        className="flex items-center justify-between px-4 bg-ds-sidebar border-b border-white/10"
        style={{ height: 48, flexShrink: 0 }}
      >
        <span className="font-display text-white text-base font-semibold tracking-wide">
          Genesis
        </span>
        <NotificationBell userId={userId} basePath="/m" />
      </header>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav
        className="flex items-center justify-around bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
        style={{
          height: 72,
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const badge = tab.id === "inbox" ? unreadInbox : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
            >
              <div className="relative">
                {tab.icon(active)}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "#2563eb" : "#9ca3af" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
