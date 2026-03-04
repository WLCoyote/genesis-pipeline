"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/app/components/NotificationBell";
import { UserRole } from "@/lib/types";

interface MobileShellProps {
  role: UserRole;
  userName: string;
  userId: string;
  children: React.ReactNode;
}

const tabs = [
  {
    label: "Pipeline",
    href: "/m/pipeline",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: "Commission",
    href: "/m/commission",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    href: "/m/notifications",
    icon: (active: boolean) => (
      <svg className="w-6 h-6" fill="none" stroke={active ? "#2563eb" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
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

  // Clear "stay on desktop" override when user navigates to mobile app
  useEffect(() => {
    localStorage.removeItem("stay_desktop");
  }, []);

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
          height: 56,
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
            >
              {tab.icon(active)}
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
