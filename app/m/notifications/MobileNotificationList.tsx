"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/types";
import NotificationItem from "@/app/components/NotificationItem";

interface MobileNotificationListProps {
  userId: string;
  initialNotifications: Notification[];
}

export default function MobileNotificationList({
  userId,
  initialNotifications,
}: MobileNotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`m-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }

    if (notification.type === "unmatched_sms") {
      // No inbox in mobile — stay on notifications
    } else if (notification.estimate_id) {
      router.push(`/m/estimates/${notification.estimate_id}`);
    }
  };

  const markAllRead = async () => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-lg font-semibold text-ds-text dark:text-gray-100">
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-ds-blue font-semibold cursor-pointer"
          >
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={() => handleClick(n)}
            />
          ))
        )}
      </div>
    </div>
  );
}
