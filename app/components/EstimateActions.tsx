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
    <div className="border-b border-ds-border dark:border-gray-700 px-4.5 py-4 space-y-3">
      <div className="text-[10px] font-black uppercase tracking-[2px] text-ds-gray dark:text-gray-400">
        Quick Actions
      </div>

      {/* Won/Lost info */}
      {status === "won" && (
        <div className="bg-ds-green-bg dark:bg-green-900/30 border border-ds-green/25 rounded-lg p-3">
          <div className="text-[13px] font-bold text-ds-green dark:text-green-300">
            Customer approved this estimate in Housecall Pro
          </div>
        </div>
      )}

      {status === "lost" && (
        <div className="bg-ds-red-bg dark:bg-red-900/30 border border-ds-red/25 rounded-lg p-3">
          <div className="text-[13px] font-bold text-ds-red dark:text-red-300">
            Estimate declined — follow-ups stopped
          </div>
        </div>
      )}

      {/* Snooze info */}
      {status === "snoozed" && snoozeUntil && (
        <div className="bg-ds-yellow-bg dark:bg-yellow-900/30 border border-ds-yellow/40 rounded-lg p-3">
          <div className="text-[13px] font-bold text-[#795500] dark:text-yellow-300">
            Snoozed until{" "}
            {new Date(snoozeUntil).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          {snoozeNote && (
            <div className="text-[12px] text-[#795500]/80 dark:text-yellow-400 mt-1">{snoozeNote}</div>
          )}
        </div>
      )}

      {/* Sequence paused banner */}
      {!sequenceIsActive && !isTerminal && (
        <div className="bg-ds-yellow-bg dark:bg-yellow-900/30 border border-ds-yellow/40 rounded-lg p-3">
          <div className="text-[13px] font-bold text-[#795500] dark:text-yellow-300">
            ⏸ Sequence is paused — follow-ups on hold
          </div>
          <p className="text-[11px] text-[#795500]/80 dark:text-yellow-400 mt-1">
            Resume the sequence in Admin &rarr; Sequences to continue sending.
          </p>
        </div>
      )}

      {/* Pending message edit — hidden when paused */}
      {sequenceIsActive && pendingEvent && !showEdit && (
        <div className="bg-ds-blue-bg dark:bg-blue-900/30 border border-ds-blue/25 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-ds-blue dark:text-blue-300">
              Pending {pendingEvent.channel} ready for review
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="text-[12px] font-bold text-ds-blue hover:text-ds-blue-lt cursor-pointer bg-transparent border-none"
            >
              Edit
            </button>
          </div>
          {pendingEvent.content && (
            <p className="text-[12px] text-ds-blue/80 dark:text-blue-400 mt-1 line-clamp-2">
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
        <div className="bg-ds-green-bg dark:bg-green-900/30 border border-ds-green/25 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-bold text-ds-green dark:text-green-300">
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
              className="px-3 py-1.5 bg-ds-green text-white text-[12px] font-bold rounded-[7px] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer border-none"
            >
              {sending ? "Sending..." : "Send Now"}
            </button>
          </div>
          {sendResult && (
            <div className={`text-[12px] mt-1 font-bold ${sendResult.includes("Failed") ? "text-ds-red" : "text-ds-green dark:text-green-400"}`}>
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
                className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold bg-ds-yellow text-ds-text cursor-pointer hover:brightness-105 transition-all border-none"
              >
                Snooze
              </button>
              <button
                onClick={() => setShowStatusModal("won")}
                className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold bg-ds-green-bg text-ds-green border-[1.5px] border-ds-green/30 hover:bg-ds-green hover:text-white transition-colors cursor-pointer"
              >
                Won
              </button>
              <button
                onClick={() => setShowStatusModal("lost")}
                className="flex-1 px-3 py-2.5 rounded-lg text-[12px] font-bold bg-ds-red-bg text-ds-red border-[1.5px] border-ds-red/20 hover:bg-ds-red hover:text-white transition-colors cursor-pointer"
              >
                Lost
              </button>
            </>
          )}

          {isTerminal && (
            <button
              onClick={handleReactivate}
              disabled={loading === "active"}
              className="px-4 py-[7px] bg-ds-blue text-white text-[13px] font-bold rounded-[7px] shadow-[0_3px_10px_rgba(21,101,192,0.3)] hover:bg-ds-blue-lt disabled:opacity-50 transition-colors cursor-pointer border-none"
            >
              {loading === "active" ? "..." : "Reactivate"}
            </button>
          )}

          {!isTerminal && sequenceIsActive && currentStepIndex < totalSteps && (
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
              className="px-3 py-2 border border-ds-border dark:border-gray-600 text-ds-gray dark:text-gray-300 text-[12px] font-bold rounded-[7px] hover:bg-ds-bg dark:hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer bg-transparent"
            >
              {skipping ? "..." : "Skip Step"}
            </button>
          )}
        </div>
      )}

      {/* Help text */}
      {!isTerminal && (
        <p className="text-[11px] text-ds-gray-lt dark:text-gray-500 leading-relaxed">
          Won/Lost status updates automatically when the customer approves or all options are declined in HCP. Use the buttons above for manual override only.
        </p>
      )}

      {/* Delete — admin only */}
      {isAdmin && (
        <div className="pt-2 border-t border-ds-border/50 dark:border-gray-700">
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
            className="text-[12px] text-ds-red hover:underline disabled:opacity-50 transition-colors cursor-pointer bg-transparent border-none"
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
    <div className="bg-ds-bg dark:bg-gray-900/50 border border-ds-border dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-ds-text dark:text-gray-100">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="text-ds-gray hover:text-ds-text text-[12px] cursor-pointer bg-transparent border-none"
        >
          Cancel
        </button>
      </div>

      {isWon && (
        <p className="text-[11px] text-ds-text-lt dark:text-gray-400">
          Selected options will be marked as won locally. Unselected pending options will be declined in HCP.
        </p>
      )}
      {!isWon && (
        <p className="text-[11px] text-ds-text-lt dark:text-gray-400">
          Selected options will be declined in HCP. If all options are declined, the estimate will be marked as lost.
        </p>
      )}

      {/* Options with already-resolved status shown as disabled */}
      <div className="space-y-1.5">
        {options.map((opt) => {
          const isPending = opt.status === "pending";
          const isChecked = selected.has(opt.id);

          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border-[1.5px] transition-colors ${
                isPending
                  ? isChecked
                    ? isWon
                      ? "border-ds-green/30 bg-ds-green-bg dark:border-green-700 dark:bg-green-900/20"
                      : "border-ds-red/30 bg-ds-red-bg dark:border-red-700 dark:bg-red-900/20"
                    : "border-ds-border dark:border-gray-700 hover:bg-ds-bg dark:hover:bg-gray-800"
                  : "border-ds-border/50 dark:border-gray-800 opacity-50"
              } ${isPending ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => isPending && toggleOption(opt.id)}
                disabled={!isPending}
                className="rounded border-ds-border dark:border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ds-text dark:text-gray-100">
                  {opt.description || `Option ${opt.option_number}`}
                </div>
                {opt.amount !== null && (
                  <div className="text-[12px] text-ds-text-lt dark:text-gray-400">
                    ${opt.amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </div>
                )}
              </div>
              {!isPending && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[5px] ${
                  opt.status === "approved"
                    ? "bg-ds-green-bg text-ds-green dark:bg-green-900/30 dark:text-green-400"
                    : "bg-ds-red-bg text-ds-red dark:bg-red-900/30 dark:text-red-400"
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
          className={`px-4 py-[7px] text-[13px] font-bold rounded-[7px] disabled:opacity-50 transition-colors cursor-pointer border-none ${
            isWon
              ? "bg-ds-green text-white hover:brightness-110"
              : "bg-ds-red text-white hover:brightness-110"
          }`}
        >
          {submitting
            ? "..."
            : selected.size === pendingOptions.length
              ? `Mark All as ${isWon ? "Won" : "Lost"}`
              : `Mark ${selected.size} as ${isWon ? "Won" : "Lost"}`}
        </button>
        {selected.size < pendingOptions.length && (
          <button
            onClick={selectAll}
            className="px-3 py-2 text-[12px] text-ds-gray dark:text-gray-400 hover:text-ds-text dark:hover:text-gray-200 transition-colors cursor-pointer bg-transparent border-none"
          >
            Select All
          </button>
        )}
      </div>
    </div>
  );
}
