import { Notification } from "@/lib/types";

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

const typeIcons: Record<string, string> = {
  email_opened: "👁️",
  link_clicked: "🔗",
  call_due: "📞",
  lead_assigned: "📋",
  estimate_approved: "✅",
  estimate_declined: "❌",
  declining_soon: "⚠️",
  sms_received: "💬",
  unmatched_sms: "📥",
};

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

export default function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5">
          {typeIcons[notification.type] || "🔔"}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-gray-100 font-medium"}`}>
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {timeAgo(notification.created_at)}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
        )}
      </div>
    </button>
  );
}
