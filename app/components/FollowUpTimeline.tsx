import { FollowUpEvent, EstimateStatus } from "@/lib/types";
import ExecuteStepButton from "./ExecuteStepButton";

// Only the fields the timeline needs (template is not used here)
interface TimelineStep {
  day_offset: number;
  channel: string;
  is_call_task: boolean;
}

interface FollowUpTimelineProps {
  estimateId?: string;
  events: FollowUpEvent[];
  sequenceSteps?: TimelineStep[] | null;
  sentDate?: string | null;
  currentStepIndex?: number;
  estimateStatus?: EstimateStatus;
  sequenceIsActive?: boolean;
}

const channelIcons: Record<string, string> = {
  email: "✉️",
  sms: "💬",
  call: "📞",
};

const channelCircleColors: Record<string, string> = {
  sms: "bg-gradient-to-br from-[#1565c0] to-[#1e88e5]",
  email: "bg-gradient-to-br from-[#e65100] to-[#ff6d00]",
  call: "bg-gradient-to-br from-[#2e7d32] to-[#43a047]",
};

const channelBadgeColors: Record<string, string> = {
  sms: "bg-ds-blue-bg text-ds-blue",
  email: "bg-ds-orange-bg text-ds-orange",
  call: "bg-ds-green-bg text-ds-green",
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
  displayStatus: "executed" | "skipped" | "current" | "upcoming" | "not_reached" | "paused";
  projectedDate: Date | null;
};

export default function FollowUpTimeline({
  estimateId,
  events,
  sequenceSteps = null,
  sentDate = null,
  currentStepIndex = 0,
  estimateStatus = "active",
  sequenceIsActive = true,
}: FollowUpTimelineProps) {
  // If no sequence steps, fall back to events-only display
  if (!sequenceSteps || !sentDate) {
    return <EventsOnlyTimeline events={events} />;
  }

  // Build event lookup by sequence_step_index
  const eventMap = new Map<number, FollowUpEvent>();
  for (const event of events) {
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
    if (event && (!sequenceIsActive && (event.status === "pending_review" || event.status === "scheduled"))) {
      displayStatus = "paused";
    } else if (event) {
      displayStatus = "executed";
    } else if (i < currentStepIndex) {
      displayStatus = "skipped";
    } else if (!sequenceIsActive && !isTerminal) {
      displayStatus = "paused";
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
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl shadow-ds overflow-hidden">
      <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-3 flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-[2px] text-ds-text dark:text-gray-100 flex items-center gap-2">
          <span>🗓</span> Follow-Up Timeline
        </div>
        <span className="text-[11px] text-ds-gray-lt dark:text-gray-500">
          {unifiedSteps.length} steps
        </span>
      </div>

      <div className="p-4 pl-2">
        {unifiedSteps.map((step, i) => (
          <StepRow
            key={step.index}
            step={step}
            estimateId={estimateId}
            isLast={i === unifiedSteps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function StepRow({ step, estimateId, isLast }: { step: UnifiedStep; estimateId?: string; isLast: boolean }) {
  const isCurrent = step.displayStatus === "current";
  const isSkipped = step.displayStatus === "skipped";
  const isUpcoming = step.displayStatus === "upcoming";
  const isNotReached = step.displayStatus === "not_reached";
  const isPaused = step.displayStatus === "paused";
  const isDimmed = isUpcoming || isNotReached || isPaused;

  const event = step.event;
  const displayChannel = event ? event.channel : step.channel;
  const displayIsCallTask = event ? event.channel === "call" : step.isCallTask;

  const circleColor = channelCircleColors[displayChannel] || channelCircleColors.sms;
  const badgeColor = channelBadgeColors[displayChannel] || channelBadgeColors.sms;

  return (
    <div className="flex gap-0">
      {/* Connector column */}
      <div className="flex flex-col items-center w-12 shrink-0 pt-3">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.12)] z-10 ${
            isDimmed || isSkipped ? "bg-ds-bg border border-ds-border" : circleColor
          }`}
        >
          <span className={isDimmed || isSkipped ? "opacity-50" : ""}>
            {channelIcons[displayChannel] || "📋"}
          </span>
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-4 bg-ds-border dark:bg-gray-600 mt-1" />
        )}
      </div>

      {/* Step content */}
      <div className={`flex-1 pb-3 ${isCurrent ? "mb-1" : ""}`}>
        <div
          className={`rounded-lg px-3.5 py-2.5 ${
            isCurrent
              ? "bg-ds-blue-bg dark:bg-blue-900/20 border border-ds-blue/25"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {/* Channel badge */}
            <span className={`text-[10px] font-black tracking-[1px] uppercase px-2 py-0.5 rounded-[5px] ${
              isDimmed || isSkipped ? "bg-ds-bg text-ds-gray-lt dark:bg-gray-700 dark:text-gray-500" : badgeColor
            }`}>
              {displayIsCallTask ? "Call" : displayChannel}
            </span>

            {/* Day label */}
            <span className={`text-[12px] font-black ${
              isDimmed ? "text-ds-gray-lt dark:text-gray-500" : "text-ds-text dark:text-gray-100"
            } ${isSkipped ? "line-through" : ""}`}>
              Day {step.dayOffset}
            </span>

            {/* Status */}
            <StepStatusBadge step={step} />

            {/* Execute button for skipped steps */}
            {isSkipped && estimateId && (
              <ExecuteStepButton
                estimateId={estimateId}
                stepIndex={step.index}
                channel={step.channel}
                isCallTask={step.isCallTask}
              />
            )}
          </div>

          {/* Event content */}
          {event && event.content && step.displayStatus === "executed" && (
            <p className="text-[12px] text-ds-text-lt dark:text-gray-400 mt-1 line-clamp-2">
              {event.content}
            </p>
          )}

          {/* Timestamp */}
          <TimestampLine step={step} />
        </div>
      </div>
    </div>
  );
}

function StepStatusBadge({ step }: { step: UnifiedStep }) {
  if (step.displayStatus === "executed" && step.event) {
    const event = step.event;
    const isGreen = ["sent", "completed", "opened", "clicked"].includes(event.status);
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] ${
        isGreen
          ? "bg-ds-green-bg text-ds-green dark:bg-green-900/30 dark:text-green-400"
          : "bg-ds-bg text-ds-gray dark:bg-gray-700 dark:text-gray-400"
      }`}>
        {statusLabels[event.status] || event.status}
        {event.comfort_pro_edited && (
          <span className="ml-1 bg-ds-blue-bg text-ds-blue dark:bg-blue-900/30 dark:text-blue-400 px-1 py-px rounded text-[9px]">
            Edited
          </span>
        )}
      </span>
    );
  }

  if (step.displayStatus === "skipped") {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] bg-ds-bg text-ds-gray-lt dark:bg-gray-700 dark:text-gray-500">
        Skipped
      </span>
    );
  }

  if (step.displayStatus === "current") {
    return (
      <span className="text-[10px] font-bold text-ds-blue dark:text-blue-400">
        ▶ Current Step
      </span>
    );
  }

  if (step.displayStatus === "paused") {
    return (
      <span className="text-[10px] font-bold text-[#795500] dark:text-yellow-400">
        ⏸ Paused
      </span>
    );
  }

  if (step.displayStatus === "upcoming") {
    return (
      <span className="text-[10px] text-ds-gray-lt dark:text-gray-500">
        Upcoming
      </span>
    );
  }

  // not_reached
  return (
    <span className="text-[10px] text-ds-gray-lt dark:text-gray-500">
      Not Reached
    </span>
  );
}

function TimestampLine({ step }: { step: UnifiedStep }) {
  const event = step.event;

  if (step.displayStatus === "executed" && event) {
    if (event.sent_at) {
      return (
        <div className="text-[11px] text-ds-gray-lt dark:text-gray-500 mt-0.5">
          {formatTimestamp(event.sent_at)}
        </div>
      );
    }
    if (event.scheduled_at) {
      return (
        <div className="text-[11px] text-ds-gray-lt dark:text-gray-500 mt-0.5">
          Scheduled {formatTimestamp(event.scheduled_at)}
        </div>
      );
    }
    return null;
  }

  if (step.displayStatus === "upcoming" && step.projectedDate) {
    return (
      <div className="text-[11px] text-ds-gray-lt dark:text-gray-500 mt-0.5">
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
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl shadow-ds overflow-hidden">
      <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-3">
        <div className="text-[11px] font-black uppercase tracking-[2px] text-ds-text dark:text-gray-100 flex items-center gap-2">
          <span>🗓</span> Follow-Up Timeline
        </div>
      </div>

      <div className="p-4">
        {sorted.length === 0 ? (
          <p className="text-[13px] text-ds-gray-lt dark:text-gray-500">No follow-up events yet.</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2 border-b border-ds-border/50 dark:border-gray-700/50 last:border-0"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] shadow-[0_2px_6px_rgba(0,0,0,0.12)] shrink-0 ${
                  channelCircleColors[event.channel] || channelCircleColors.sms
                }`}>
                  {channelIcons[event.channel] || "📋"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-ds-text dark:text-gray-100 capitalize">
                      {event.channel}
                    </span>
                    <span className="text-[11px] text-ds-gray-lt dark:text-gray-500">
                      Step {event.sequence_step_index + 1}
                    </span>
                    {event.comfort_pro_edited && (
                      <span className="text-[10px] font-bold bg-ds-blue-bg text-ds-blue dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">
                        Edited
                      </span>
                    )}
                  </div>
                  {event.content && (
                    <p className="text-[12px] text-ds-text-lt dark:text-gray-400 mt-0.5 line-clamp-2">
                      {event.content}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] ${
                      ["sent", "completed", "opened"].includes(event.status)
                        ? "bg-ds-green-bg text-ds-green"
                        : "bg-ds-bg text-ds-gray"
                    }`}>
                      {statusLabels[event.status] || event.status}
                    </span>
                    {event.sent_at && (
                      <span className="text-[11px] text-ds-gray-lt dark:text-gray-500">
                        {formatTimestamp(event.sent_at)}
                      </span>
                    )}
                    {!event.sent_at && event.scheduled_at && (
                      <span className="text-[11px] text-ds-gray-lt dark:text-gray-500">
                        Scheduled {formatTimestamp(event.scheduled_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
