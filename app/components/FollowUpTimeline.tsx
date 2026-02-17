import { FollowUpEvent } from "@/lib/types";

interface FollowUpTimelineProps {
  events: FollowUpEvent[];
}

const channelIcons: Record<string, string> = {
  email: "✉️",
  sms: "💬",
  call: "📞",
};

const statusIcons: Record<string, string> = {
  scheduled: "🕐",
  pending_review: "✏️",
  sent: "✅",
  opened: "👁️",
  clicked: "🔗",
  completed: "✅",
  skipped: "⏭️",
  snoozed: "😴",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  pending_review: "Pending Review",
  sent: "Sent",
  opened: "Opened",
  clicked: "Clicked",
  completed: "Completed",
  skipped: "Skipped",
  snoozed: "Snoozed",
};

function formatTimestamp(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FollowUpTimeline({ events }: FollowUpTimelineProps) {
  const sorted = [...events].sort((a, b) => {
    const aTime = a.scheduled_at
      ? new Date(a.scheduled_at).getTime()
      : new Date(a.created_at).getTime();
    const bTime = b.scheduled_at
      ? new Date(b.scheduled_at).getTime()
      : new Date(b.created_at).getTime();
    return aTime - bTime;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Follow-Up Timeline
      </h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No follow-up events yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="text-lg leading-none mt-0.5">
                {channelIcons[event.channel] || "📋"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {event.channel}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Step {event.sequence_step_index + 1}
                  </span>
                  {event.comfort_pro_edited && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                      Edited
                    </span>
                  )}
                </div>
                {event.content && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {event.content}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs">
                    {statusIcons[event.status] || ""}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {statusLabels[event.status] || event.status}
                  </span>
                  {event.sent_at && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      · {formatTimestamp(event.sent_at)}
                    </span>
                  )}
                  {!event.sent_at && event.scheduled_at && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      · Scheduled {formatTimestamp(event.scheduled_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
