import { FollowUpEvent, EstimateStatus } from "@/lib/types";

// Only the fields the timeline needs (template is not used here)
interface TimelineStep {
  day_offset: number;
  channel: string;
  is_call_task: boolean;
}

interface FollowUpTimelineProps {
  events: FollowUpEvent[];
  sequenceSteps?: TimelineStep[] | null;
  sentDate?: string | null;
  currentStepIndex?: number;
  estimateStatus?: EstimateStatus;
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

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type UnifiedStep = {
  index: number;
  channel: string;
  dayOffset: number;
  isCallTask: boolean;
  event: FollowUpEvent | null;
  displayStatus: "executed" | "skipped" | "current" | "upcoming" | "not_reached";
  projectedDate: Date | null;
};

export default function FollowUpTimeline({
  events,
  sequenceSteps = null,
  sentDate = null,
  currentStepIndex = 0,
  estimateStatus = "active",
}: FollowUpTimelineProps) {
  // If no sequence steps, fall back to events-only display
  if (!sequenceSteps || !sentDate) {
    return <EventsOnlyTimeline events={events} />;
  }

  // Build event lookup by sequence_step_index
  const eventMap = new Map<number, FollowUpEvent>();
  for (const event of events) {
    // If multiple events exist for a step, prefer the most recent
    const existing = eventMap.get(event.sequence_step_index);
    if (!existing || new Date(event.created_at) > new Date(existing.created_at)) {
      eventMap.set(event.sequence_step_index, event);
    }
  }

  const isTerminal = estimateStatus === "won" || estimateStatus === "lost" || estimateStatus === "dormant";
  const sent = new Date(sentDate);

  // Build unified steps from current sequence
  const unifiedSteps: UnifiedStep[] = sequenceSteps.map((step, i) => {
    const event = eventMap.get(i) || null;
    const projectedDate = new Date(sent);
    projectedDate.setDate(projectedDate.getDate() + step.day_offset);

    let displayStatus: UnifiedStep["displayStatus"];
    if (event) {
      displayStatus = "executed";
    } else if (i < currentStepIndex) {
      displayStatus = "skipped";
    } else if (i === currentStepIndex && !isTerminal) {
      displayStatus = "current";
    } else if (i > currentStepIndex && !isTerminal) {
      displayStatus = "upcoming";
    } else {
      displayStatus = "not_reached";
    }

    return {
      index: i,
      channel: step.channel,
      dayOffset: step.day_offset,
      isCallTask: step.is_call_task,
      event,
      displayStatus,
      projectedDate,
    };
  });

  // Append orphaned events (from steps that no longer exist in the sequence)
  for (const [idx, event] of eventMap) {
    if (idx >= sequenceSteps.length) {
      unifiedSteps.push({
        index: idx,
        channel: event.channel,
        dayOffset: 0,
        isCallTask: event.channel === "call",
        event,
        displayStatus: "executed",
        projectedDate: null,
      });
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Follow-Up Timeline
      </h2>

      <div className="space-y-1">
        {unifiedSteps.map((step) => (
          <StepRow key={step.index} step={step} />
        ))}
      </div>
    </div>
  );
}

function StepRow({ step }: { step: UnifiedStep }) {
  const isCurrent = step.displayStatus === "current";
  const isUpcoming = step.displayStatus === "upcoming";
  const isSkipped = step.displayStatus === "skipped";
  const isNotReached = step.displayStatus === "not_reached";
  const isDimmed = isUpcoming || isNotReached;

  const rowClasses = [
    "flex items-start gap-3 py-2.5 px-3 rounded-md",
    isCurrent
      ? "border-l-3 border-blue-500 bg-blue-50/60 dark:bg-blue-900/20"
      : "border-l-3 border-transparent",
    isSkipped ? "opacity-60" : "",
    isNotReached ? "opacity-40" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const event = step.event;
  // For executed steps, show what actually happened (event data).
  // For future steps, show current sequence configuration.
  const displayChannel = event ? event.channel : step.channel;
  const displayIsCallTask = event ? event.channel === "call" : step.isCallTask;

  return (
    <div className={rowClasses}>
      {/* Step number + channel icon */}
      <div className="flex items-center gap-1.5 shrink-0 w-16">
        <span className={`text-xs font-mono ${isDimmed ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>
          {step.index + 1}.
        </span>
        <span className="text-base leading-none">
          {channelIcons[displayChannel] || "📋"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Day label */}
          <span className={`text-sm font-medium ${isDimmed ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"} ${isSkipped ? "line-through" : ""}`}>
            Day {step.dayOffset}
          </span>

          {/* Channel */}
          <span className={`text-xs capitalize ${isDimmed ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>
            {displayIsCallTask ? "Call task" : displayChannel}
          </span>

          {/* Status badge */}
          <StatusBadge step={step} />
        </div>

        {/* Event content or timestamp */}
        {event && event.content && step.displayStatus === "executed" && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {event.content}
          </p>
        )}

        {/* Timestamp line */}
        <TimestampLine step={step} />
      </div>
    </div>
  );
}

function StatusBadge({ step }: { step: UnifiedStep }) {
  if (step.displayStatus === "executed" && step.event) {
    const event = step.event;
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span>{statusIcons[event.status] || ""}</span>
        <span className="text-gray-600 dark:text-gray-400">
          {statusLabels[event.status] || event.status}
        </span>
        {event.comfort_pro_edited && (
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
            Edited
          </span>
        )}
      </span>
    );
  }

  if (step.displayStatus === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
        <span>⏭️</span>
        <span>Skipped</span>
      </span>
    );
  }

  if (step.displayStatus === "current") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
        <span>▶</span>
        <span>Current Step</span>
      </span>
    );
  }

  if (step.displayStatus === "upcoming") {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Upcoming
      </span>
    );
  }

  // not_reached
  return (
    <span className="text-xs text-gray-400 dark:text-gray-500">
      Not Reached
    </span>
  );
}

function TimestampLine({ step }: { step: UnifiedStep }) {
  const event = step.event;

  if (step.displayStatus === "executed" && event) {
    if (event.sent_at) {
      return (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatTimestamp(event.sent_at)}
        </div>
      );
    }
    if (event.scheduled_at) {
      return (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Scheduled {formatTimestamp(event.scheduled_at)}
        </div>
      );
    }
    return null;
  }

  if (step.displayStatus === "upcoming" && step.projectedDate) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        Due {formatDate(step.projectedDate)}
      </div>
    );
  }

  return null;
}

// Fallback for estimates without sequence data
function EventsOnlyTimeline({ events }: { events: FollowUpEvent[] }) {
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
