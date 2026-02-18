"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EstimateStatus, FollowUpEvent, EstimateOption } from "@/lib/types";
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
  isAdmin?: boolean;
  nextDueStep?: NextDueStep | null;
  currentStepIndex?: number;
  totalSteps?: number;
  sequenceIsActive?: boolean;
  options?: EstimateOption[];
}

export default function EstimateActions({
  estimateId,
  status,
  snoozeNote,
  snoozeUntil,
  pendingEvent,
  isAdmin = false,
  nextDueStep = null,
  currentStepIndex = 0,
  totalSteps = 0,
  sequenceIsActive = true,
  options = [],
}: EstimateActionsProps) {
  const router = useRouter();
  const [showSnooze, setShowSnooze] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [skipping, setSkipping] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<"won" | "lost" | null>(null);

  const handleReactivate = async () => {
    if (!confirm("Reactivate this estimate and resume follow-ups?")) return;
    setLoading("active");
    const res = await fetch(`/api/estimates/${estimateId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    if (res.ok) router.refresh();
    setLoading("");
  };

  const isTerminal = status === "won" || status === "lost";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Actions
      </h2>

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

      {/* Sequence paused banner */}
      {!sequenceIsActive && !isTerminal && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            ⏸️ Sequence is paused — follow-ups on hold
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
            Resume the sequence in Admin &rarr; Sequences to continue sending.
          </p>
        </div>
      )}

      {/* Pending message edit — hidden when paused */}
      {sequenceIsActive && pendingEvent && !showEdit && (
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

      {/* Send Now — next due step (hidden when paused) */}
      {sequenceIsActive && nextDueStep && !pendingEvent && (
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

      {/* Status change modal */}
      {showStatusModal && (
        <OptionSelectModal
          action={showStatusModal}
          options={options}
          estimateId={estimateId}
          onClose={() => setShowStatusModal(null)}
          onSuccess={() => {
            setShowStatusModal(null);
            router.refresh();
          }}
        />
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
              {sequenceIsActive && currentStepIndex < totalSteps && (
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
                onClick={() => setShowStatusModal("won")}
                className="px-4 py-2 border border-green-300 text-green-700 text-sm font-medium rounded-md hover:bg-green-50 transition-colors"
              >
                Mark Won
              </button>
              <button
                onClick={() => setShowStatusModal("lost")}
                className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
              >
                Mark Lost
              </button>
            </>
          )}

          {isTerminal && (
            <button
              onClick={handleReactivate}
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

// --- Option selection modal ---

function OptionSelectModal({
  action,
  options,
  estimateId,
  onClose,
  onSuccess,
}: {
  action: "won" | "lost";
  options: EstimateOption[];
  estimateId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const pendingOptions = options.filter((o) => o.status === "pending");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(pendingOptions.map((o) => o.id))
  );
  const [submitting, setSubmitting] = useState(false);

  const isWon = action === "won";
  const title = isWon ? "Mark Options as Won" : "Mark Options as Lost";
  const color = isWon ? "green" : "red";

  const toggleOption = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(pendingOptions.map((o) => o.id)));

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);

    const res = await fetch(`/api/estimates/${estimateId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        selected_option_ids: Array.from(selected),
      }),
    });

    if (res.ok) {
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          Cancel
        </button>
      </div>

      {isWon && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selected options will be marked as won locally. Unselected pending options will be declined in HCP.
        </p>
      )}
      {!isWon && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selected options will be declined in HCP. If all options are declined, the estimate will be marked as lost.
        </p>
      )}

      {/* Options with already-resolved status shown as disabled */}
      <div className="space-y-2">
        {options.map((opt) => {
          const isPending = opt.status === "pending";
          const isChecked = selected.has(opt.id);

          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-2.5 rounded-md border transition-colors ${
                isPending
                  ? isChecked
                    ? isWon
                      ? "border-green-200 bg-green-50/50 dark:border-green-700 dark:bg-green-900/20"
                      : "border-red-200 bg-red-50/50 dark:border-red-700 dark:bg-red-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  : "border-gray-100 dark:border-gray-800 opacity-50"
              } ${isPending ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => isPending && toggleOption(opt.id)}
                disabled={!isPending}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {opt.description || `Option ${opt.option_number}`}
                </div>
                {opt.amount !== null && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ${opt.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </div>
                )}
              </div>
              {!isPending && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  opt.status === "approved"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}>
                  {opt.status === "approved" ? "Won" : "Declined"}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={submitting || selected.size === 0}
          className={`px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 transition-colors ${
            isWon
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {submitting
            ? "..."
            : selected.size === pendingOptions.length
              ? `Mark All as ${isWon ? "Won" : "Lost"}`
              : `Mark ${selected.size} Selected as ${isWon ? "Won" : "Lost"}`}
        </button>
        {selected.size < pendingOptions.length && (
          <button
            onClick={selectAll}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Select All
          </button>
        )}
      </div>
    </div>
  );
}
