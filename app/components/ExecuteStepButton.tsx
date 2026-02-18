"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExecuteStepButtonProps {
  estimateId: string;
  stepIndex: number;
  channel: string;
  isCallTask: boolean;
}

export default function ExecuteStepButton({
  estimateId,
  stepIndex,
  channel,
  isCallTask,
}: ExecuteStepButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  const label = isCallTask ? "Schedule Call" : `Send ${channel.toUpperCase()}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={async () => {
          if (
            !confirm(
              `Execute step ${stepIndex + 1}? This will ${isCallTask ? "schedule a call task" : `send the ${channel}`} now.`
            )
          )
            return;
          setSending(true);
          setResult("");
          try {
            const res = await fetch(
              `/api/estimates/${estimateId}/execute-step`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ step_index: stepIndex }),
              }
            );
            const data = await res.json();
            if (res.ok) {
              setResult(
                data.sent === "call" ? "Scheduled" : "Sent"
              );
              router.refresh();
            } else {
              setResult(data.error || "Failed");
            }
          } catch {
            setResult("Failed");
          }
          setSending(false);
        }}
        disabled={sending}
        className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {sending ? "..." : label}
      </button>
      {result && (
        <span
          className={`text-xs ${result === "Failed" ? "text-red-500" : "text-green-600 dark:text-green-400"}`}
        >
          {result}
        </span>
      )}
    </span>
  );
}
