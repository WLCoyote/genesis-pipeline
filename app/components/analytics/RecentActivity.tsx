interface ActivityItem {
  id: string;
  type: "signed" | "sms_sent" | "email_sent" | "call_made" | "new_lead" | "status_change" | "proposal_viewed";
  description: string;
  timestamp: string;
  amount?: number | null;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const typeConfig: Record<string, { icon: string; color: string }> = {
  signed: { icon: "✍️", color: "text-ds-green" },
  sms_sent: { icon: "💬", color: "text-ds-blue" },
  email_sent: { icon: "📧", color: "text-ds-orange" },
  call_made: { icon: "📞", color: "text-[#2e7d32]" },
  new_lead: { icon: "🆕", color: "text-[#7c4dff]" },
  status_change: { icon: "🔄", color: "text-ds-gray" },
  proposal_viewed: { icon: "👀", color: "text-ds-blue" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl shadow-ds overflow-hidden">
      <div className="border-b border-ds-border dark:border-gray-700 px-5 py-3">
        <div className="text-[11px] font-black uppercase tracking-[2px] text-ds-text dark:text-gray-100">
          Recent Activity
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="p-5 text-[13px] text-ds-gray-lt text-center">
          No recent activity.
        </div>
      ) : (
        <div className="divide-y divide-ds-border/50 dark:divide-gray-700/50 max-h-[400px] overflow-y-auto">
          {activities.map((item) => {
            const cfg = typeConfig[item.type] || typeConfig.status_change;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-ds-bg dark:hover:bg-gray-700/30 transition-colors"
              >
                <span className="text-[14px] shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ds-text dark:text-gray-100 truncate">
                    {item.description}
                  </p>
                </div>
                {item.amount != null && item.amount > 0 && (
                  <span className="font-display font-bold text-[13px] text-ds-green shrink-0">
                    ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </span>
                )}
                <span className="text-[11px] text-ds-gray-lt dark:text-gray-500 shrink-0 whitespace-nowrap">
                  {timeAgo(item.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
