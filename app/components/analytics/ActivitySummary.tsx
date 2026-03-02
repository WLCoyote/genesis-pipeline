interface ActivitySummaryProps {
  followUpsSentThisWeek: number;
  proposalsViewed: number;
  proposalsSignedThisMonth: number;
  overdueFollowUps: number;
}

export default function ActivitySummary({
  followUpsSentThisWeek,
  proposalsViewed,
  proposalsSignedThisMonth,
  overdueFollowUps,
}: ActivitySummaryProps) {
  const items = [
    {
      label: "Follow-Ups This Week",
      value: followUpsSentThisWeek,
      icon: "📤",
    },
    {
      label: "Proposals Viewed",
      value: proposalsViewed,
      icon: "👀",
    },
    {
      label: "Signed This Month",
      value: proposalsSignedThisMonth,
      icon: "✍️",
    },
    {
      label: "Overdue Follow-Ups",
      value: overdueFollowUps,
      icon: "⚠️",
      highlight: overdueFollowUps > 0,
    },
  ];

  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl shadow-ds overflow-hidden">
      <div className="border-b border-ds-border dark:border-gray-700 px-5 py-3">
        <div className="text-[11px] font-black uppercase tracking-[2px] text-ds-text dark:text-gray-100">
          Activity Summary
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`px-5 py-4 ${i < items.length - 1 ? "border-r border-ds-border/50 dark:border-gray-700/50" : ""}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px]">{item.icon}</span>
              <span
                className={`font-display text-[22px] font-semibold ${
                  item.highlight
                    ? "text-ds-orange"
                    : "text-ds-text dark:text-gray-100"
                }`}
              >
                {item.value}
              </span>
            </div>
            <div className="text-[11px] text-ds-gray dark:text-gray-400 font-medium">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
