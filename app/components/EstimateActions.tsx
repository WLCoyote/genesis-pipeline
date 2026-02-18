"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EstimateStatus, FollowUpEvent } from "@/lib/types";
import SnoozeForm from "./SnoozeForm";
import EditMessageForm from "./EditMessageForm";

interface NextDueStep {
  day_offset: number;
  channel: string;
  step_index: number;
  is_call_task: boolean;
}

interface EstimateActionsProps {
  estimateId: string;
  status: EstimateStatus;
  snoozeNote: string | null;
  snoozeUntil: string | null;
  pendingEvent: FollowUpEvent | null;
  onlineEstimateUrl: string | null;
  isAdmin?: boolean;
  nextDueStep?: NextDueStep | null;
  currentStepIndex?: number;
  totalSteps?: number;
}

export default function EstimateActions({
  estimateId,
  status,
  snoozeNote,
  snoozeUntil,
  pendingEvent,
  onlineEstimateUrl,
  isAdmin = false,
  nextDueStep = null,
  currentStepIndex = 0,
  totalSteps = 0,
}: EstimateActionsProps) {
  const router = useRouter();
  const [showSnooze, setShowSnooze] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [skipping, setSkipping] = useState(false);

  const handleStatusChange = async (newStatus: "won" | "lost" | "active") => {
    const confirmMsg =
      newStatus === "won"
        ? "Manually mark as won? (Normally this updates automatically when the customer signs in HCP.)"
        : newStatus === "lost"
        ? "Manually mark as lost? This will stop all follow-ups."
        : "Reactivate this estimate and resume follow-ups?";

    if (!confirm(confirmMsg)) return;

    setLoading(newStatus);

    const res = await fetch(`/api/estimates/${estimateId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      router.refresh();
    }

    setLoading("");
  };

  const isTerminal = status === "won" || status === "lost";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Actions
      </h2>

      {/* HCP estimate link */}
      {onlineEstimateUrl && (
        <a
          href={onlineEstimateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-md hover:bg-blue-100 transition-colors"
        >
          View Estimate in HCP
        </a>
      )}

      {/* Won/Lost info */}
      {status === "won" && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 rounded-md p-3">
          <div className="text-sm font-medium text-green-800 dark:text-green-300">
            Customer approved this estimate in Housecall Pro
          </div>
        </div>
      )}

      {status === "lost" && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 rounded-md p-3">
          <div className="text-sm font-medium text-red-800 dark:text-red-300">
            Estimate declined — follow-ups stopped
          </div>
        </div>
      )}

      {/* Snooze info */}
      {status === "snoozed" && snoozeUntil && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Snoozed until{" "}
            {new Date(snoozeUntil).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          {snoozeNote && (
            <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">{snoozeNote}</div>
          )}
        </div>
      )}

      {/* Pending message edit */}
      {pendingEvent && !showEdit && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800 dark:text-blue-300">
              Pending {pendingEvent.channel} ready for review
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>
          {pendingEvent.content && (
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 line-clamp-2">
              {pendingEvent.content}
            </p>
          )}
        </div>
      )}

      {showEdit && pendingEvent && (
        <EditMessageForm
          event={pendingEvent}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Send Now — next due step */}
      {nextDueStep && !pendingEvent && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-800 dark:text-green-300">
              Day {nextDueStep.day_offset} · {nextDueStep.is_call_task ? "Call task" : nextDueStep.channel.toUpperCase()} ready
            </div>
            <button
              onClick={async () => {
                setSending(true);
                setSendResult("");
                try {
                  const res = await fetch(
                    `/api/estimates/${estimateId}/send-next`,
                    { method: "POST" }
                  );
                  const data = await res.json();
                  if (res.ok) {
                    setSendResult(
                      data.sent === "call"
                        ? "Call task scheduled"
                        : data.sent === "skipped"
                          ? `Skipped: ${data.reason}`
                          : `${data.sent.toUpperCase()} sent`
                    );
                    router.refresh();
                  } else {
                    setSendResult(data.error || "Failed to send");
                  }
                } catch {
                  setSendResult("Failed to connect");
                }
                setSending(false);
              }}
              disabled={sending}
              className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {sending ? "Sending..." : "Send Now"}
            </button>
          </div>
          {sendResult && (
            <div className={`text-sm mt-1 ${sendResult.includes("Failed") ? "text-red-600" : "text-green-700 dark:text-green-400"}`}>
              {sendResult}
            </div>
          )}
        </div>
      )}

      {/* Snooze form */}
      {showSnooze ? (
        <SnoozeForm
          estimateId={estimateId}
          onCancel={() => setShowSnooze(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {!isTerminal && (
            <>
              <button
                onClick={() => setShowSnooze(true)}
                className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 transition-colors"
              >
                Snooze
              </button>
              {currentStepIndex < totalSteps && (
                <button
                  onClick={async () => {
                    if (
                      !confirm(
                        `Skip step ${currentStepIndex + 1} of ${totalSteps}? The sequence will advance to the next step.`
                      )
                    )
                      return;
                    setSkipping(true);
                    try {
                      const res = await fetch(
                        `/api/estimates/${estimateId}/skip-step`,
                        { method: "POST" }
                      );
                      if (res.ok) {
                        router.refresh();
                      }
                    } catch {
                      // silent
                    }
                    setSkipping(false);
                  }}
                  disabled={skipping}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {skipping ? "..." : "Skip Step"}
                </button>
              )}
              <button
                onClick={() => handleStatusChange("won")}
                disabled={loading === "won"}
                className="px-4 py-2 border border-green-300 text-green-700 text-sm font-medium rounded-md hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                {loading === "won" ? "..." : "Mark Won"}
              </button>
              <button
                onClick={() => handleStatusChange("lost")}
                disabled={loading === "lost"}
                className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {loading === "lost" ? "..." : "Mark Lost"}
              </button>
            </>
          )}

          {isTerminal && (
            <button
              onClick={() => handleStatusChange("active")}
              disabled={loading === "active"}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading === "active" ? "..." : "Reactivate"}
            </button>
          )}
        </div>
      )}

      {/* Help text */}
      {!isTerminal && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Won/Lost status updates automatically when the customer approves or all options are declined in HCP. Use the buttons above for manual override only.
        </p>
      )}

      {/* Delete — admin only */}
      {isAdmin && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={async () => {
              if (!confirm("Delete this estimate and all its follow-up data? This cannot be undone.")) return;
              setDeleting(true);
              const res = await fetch(`/api/estimates/${estimateId}`, { method: "DELETE" });
              if (res.ok) {
                router.push("/dashboard/estimates");
              } else {
                setDeleting(false);
              }
            }}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete Estimate"}
          </button>
        </div>
      )}
    </div>
  );
}
