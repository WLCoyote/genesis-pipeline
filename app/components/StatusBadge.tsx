import { EstimateStatus } from "@/lib/types";

const statusConfig: Record<
  EstimateStatus,
  { label: string; bg: string; text: string }
> = {
  active: { label: "Active", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
  snoozed: { label: "Snoozed", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
  won: { label: "Won", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  lost: { label: "Lost", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
  dormant: { label: "Dormant", bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-400" },
  sent: { label: "Sent", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
};

export default function StatusBadge({ status }: { status: EstimateStatus }) {
  const config = statusConfig[status] || statusConfig.sent;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
