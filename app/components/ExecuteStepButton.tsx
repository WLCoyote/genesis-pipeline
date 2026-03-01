"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExecuteStepButtonProps {
  estimateId: string;
  stepIndex: number;
  channel: string;
  isCallTask: boolean;
}

const channelStyles: Record<string, string> = {
  sms: "bg-ds-blue-bg text-ds-blue border-ds-blue/20 hover:bg-ds-blue hover:text-white",
  email: "bg-ds-orange-bg text-ds-orange border-ds-orange/20 hover:bg-ds-orange hover:text-white",
  call: "bg-ds-green-bg text-ds-green border-ds-green/20 hover:bg-ds-green hover:text-white",
};

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
  const style = channelStyles[channel] || channelStyles.sms;

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
        className={`text-[11px] font-bold px-2.5 py-1 rounded-[7px] border cursor-pointer disabled:opacity-50 transition-colors ${style}`}
      >
        {sending ? "..." : label}
      </button>
      {result && (
        <span
          className={`text-[11px] font-bold ${result === "Failed" ? "text-ds-red" : "text-ds-green dark:text-green-400"}`}
        >
          {result}
        </span>
      )}
    </span>
  );
}
