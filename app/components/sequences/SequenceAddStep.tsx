"use client";

import { useState } from "react";
import { FollowUpChannel } from "@/lib/types";

interface SequenceAddStepProps {
  onAdd: (channel: FollowUpChannel) => void;
}

export default function SequenceAddStep({ onAdd }: SequenceAddStepProps) {
  const [showOptions, setShowOptions] = useState(false);

  const handleAdd = (channel: FollowUpChannel) => {
    onAdd(channel);
    setShowOptions(false);
  };

  return (
    <div className="ml-12">
      {!showOptions ? (
        <button
          type="button"
          onClick={() => setShowOptions(true)}
          className="w-full py-3.5 bg-ds-card dark:bg-gray-800 border-2 border-dashed border-ds-border dark:border-gray-600 rounded-xl text-ds-blue dark:text-blue-400 text-[13px] font-bold cursor-pointer hover:bg-ds-blue-bg dark:hover:bg-blue-900/20 hover:border-ds-blue flex items-center justify-center gap-2 transition-colors"
        >
          + Add Step
        </button>
      ) : (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => handleAdd("sms")}
            className="flex-1 py-2.5 rounded-lg bg-ds-blue-bg dark:bg-blue-900/30 text-ds-blue dark:text-blue-400 text-[12px] font-bold border-none cursor-pointer hover:bg-ds-blue hover:text-white transition-colors"
          >
            💬 Add SMS
          </button>
          <button
            type="button"
            onClick={() => handleAdd("call")}
            className="flex-1 py-2.5 rounded-lg bg-ds-green-bg dark:bg-green-900/30 text-ds-green dark:text-green-400 text-[12px] font-bold border-none cursor-pointer hover:bg-ds-green hover:text-white transition-colors"
          >
            📞 Add Call
          </button>
          <button
            type="button"
            onClick={() => handleAdd("email")}
            className="flex-1 py-2.5 rounded-lg bg-ds-orange-bg dark:bg-orange-900/30 text-ds-orange dark:text-orange-400 text-[12px] font-bold border-none cursor-pointer hover:bg-ds-orange hover:text-white transition-colors"
          >
            ✉️ Add Email
          </button>
          <button
            type="button"
            onClick={() => setShowOptions(false)}
            className="px-3 py-2.5 rounded-lg text-ds-gray dark:text-gray-400 text-[12px] font-bold border border-ds-border dark:border-gray-600 cursor-pointer hover:bg-ds-bg dark:hover:bg-gray-700 transition-colors bg-transparent"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
