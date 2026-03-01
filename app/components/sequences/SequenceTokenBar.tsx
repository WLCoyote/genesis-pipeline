"use client";

interface SequenceTokenBarProps {
  onInsert: (token: string) => void;
}

const TOKENS = [
  "{{customer_name}}",
  "{{customer_email}}",
  "{{comfort_pro_name}}",
  "{{proposal_link}}",
  "{{estimate_number}}",
  "{{total_amount}}",
  "{{customer_address}}",
];

export default function SequenceTokenBar({ onInsert }: SequenceTokenBarProps) {
  return (
    <div className="bg-ds-card dark:bg-gray-800 border border-ds-border dark:border-gray-700 rounded-xl px-4.5 py-3 flex items-center gap-2.5 flex-wrap shadow-ds">
      <span className="text-[10px] uppercase tracking-[2px] text-ds-gray dark:text-gray-400 font-bold whitespace-nowrap">
        Insert Variable →
      </span>
      {TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => onInsert(token)}
          className="text-[11px] font-bold px-2.5 py-1 rounded-[6px] bg-ds-blue-bg dark:bg-blue-900/30 text-ds-blue dark:text-blue-400 border border-ds-blue/20 dark:border-blue-800 hover:bg-ds-blue hover:text-white cursor-pointer transition-colors whitespace-nowrap"
        >
          {token}
        </button>
      ))}
      <span className="text-[11px] text-ds-gray-lt dark:text-gray-500 italic ml-auto hidden md:inline">
        Click a variable, then click into any template to insert it
      </span>
    </div>
  );
}
