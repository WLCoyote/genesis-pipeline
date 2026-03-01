import { EstimateStatus } from "@/lib/types";

const statusConfig: Record<
  EstimateStatus,
  { label: string; bg: string; text: string }
> = {
  active: { label: "Active", bg: "bg-ds-green-bg dark:bg-green-900/30", text: "text-ds-green dark:text-green-400" },
  snoozed: { label: "Snoozed", bg: "bg-ds-yellow-bg dark:bg-yellow-900/30", text: "text-[#795500] dark:text-yellow-400" },
  won: { label: "Won", bg: "bg-ds-blue-bg dark:bg-blue-900/30", text: "text-ds-blue dark:text-blue-400" },
  lost: { label: "Lost", bg: "bg-ds-red-bg dark:bg-red-900/30", text: "text-ds-red dark:text-red-400" },
  dormant: { label: "Dormant", bg: "bg-gray-100 dark:bg-gray-700", text: "text-ds-gray dark:text-gray-400" },
  sent: { label: "Sent", bg: "bg-ds-purple-bg dark:bg-purple-900/30", text: "text-ds-purple dark:text-purple-400" },
  draft: { label: "Draft", bg: "bg-ds-orange-bg dark:bg-orange-900/30", text: "text-ds-orange dark:text-orange-400" },
};

export default function StatusBadge({ status }: { status: EstimateStatus }) {
  const config = statusConfig[status] || statusConfig.sent;
  return (
    <span
      className={`inline-flex items-center gap-[5px] px-2.5 py-1 rounded-[7px] text-[11px] font-bold ${config.bg} ${config.text}`}
    >
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      {config.label}
    </span>
  );
}
