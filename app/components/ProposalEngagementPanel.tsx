import { ProposalEngagement } from "@/lib/types";

interface ProposalEngagementPanelProps {
  engagements: ProposalEngagement[];
  proposalSignedAt: string | null;
  proposalSignedName: string | null;
  proposalPdfUrl: string | null;
}

const tierNames: Record<number, string> = {
  1: "Standard Comfort",
  2: "Enhanced Efficiency",
  3: "Premium Performance",
};

export default function ProposalEngagementPanel({
  engagements,
  proposalSignedAt,
  proposalSignedName,
  proposalPdfUrl,
}: ProposalEngagementPanelProps) {
  if (engagements.length === 0 && !proposalSignedAt) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Proposal Activity
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No proposal activity yet.
        </p>
      </div>
    );
  }

  // Compute stats
  const opens = engagements.filter((e) => e.event_type === "page_open");
  const totalOpens = opens.length;
  const lastOpen = opens.length > 0
    ? opens.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0]
    : null;

  // Total time on page (sum of session_seconds from page_open events)
  const totalSeconds = opens.reduce((sum, e) => sum + (e.session_seconds || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  // Most viewed option
  const optionViews = engagements.filter((e) => e.event_type === "option_view" && e.option_group);
  const viewCounts: Record<number, number> = {};
  for (const e of optionViews) {
    if (e.option_group) {
      viewCounts[e.option_group] = (viewCounts[e.option_group] || 0) + 1;
    }
  }
  const mostViewedTier = Object.entries(viewCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  // Financing interactions
  const financingEvents = engagements.filter(
    (e) => e.event_type === "plan_selected" || e.event_type === "calculator_open"
  );
  const plansViewed = new Set(
    financingEvents.filter((e) => e.financing_plan).map((e) => e.financing_plan)
  );

  // Addon interactions
  const addonChecks = engagements.filter((e) => e.event_type === "addon_checked").length;
  const addonUnchecks = engagements.filter((e) => e.event_type === "addon_unchecked").length;

  // Signature started but not signed
  const signatureStarted = engagements.some((e) => e.event_type === "signature_started");

  // Device type
  const deviceType = lastOpen?.device_type || null;

  // Timeline of key events
  const timelineEvents = engagements
    .filter((e) => ["page_open", "option_view", "plan_selected", "signature_started", "signed"].includes(e.event_type))
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Proposal Activity
      </h2>

      {/* Signed banner */}
      {proposalSignedAt && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md p-3 mb-4">
          <div className="text-sm font-medium text-green-800 dark:text-green-300">
            Signed by {proposalSignedName || "customer"} on{" "}
            {new Date(proposalSignedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          {proposalPdfUrl && (
            <a
              href={proposalPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
            >
              Download Signed PDF
            </a>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Opens</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {totalOpens}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Time on Page</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {totalMinutes > 0 ? `${totalMinutes}m` : totalSeconds > 0 ? `${totalSeconds}s` : "—"}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Most Viewed</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {mostViewedTier
              ? tierNames[Number(mostViewedTier[0])] || `Tier ${mostViewedTier[0]}`
              : "—"}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Device</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {deviceType || "—"}
          </div>
        </div>
      </div>

      {/* Interactions summary */}
      <div className="space-y-2 mb-4">
        {financingEvents.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-5 text-center">$</span>
            <span>
              Explored financing{plansViewed.size > 0 ? ` (${plansViewed.size} plan${plansViewed.size > 1 ? "s" : ""})` : ""}
            </span>
          </div>
        )}
        {(addonChecks > 0 || addonUnchecks > 0) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="w-5 text-center">+</span>
            <span>
              {addonChecks} addon{addonChecks !== 1 ? "s" : ""} added
              {addonUnchecks > 0 ? `, ${addonUnchecks} removed` : ""}
            </span>
          </div>
        )}
        {signatureStarted && !proposalSignedAt && (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <span className="w-5 text-center">!</span>
            <span>Started signing but didn&apos;t complete</span>
          </div>
        )}
      </div>

      {/* Event timeline */}
      {timelineEvents.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Timeline
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {timelineEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {formatEventType(event.event_type, event.option_group)}
                </span>
                <span className="text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                  {formatTimestamp(event.occurred_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatEventType(type: string, optionGroup: number | null): string {
  switch (type) {
    case "page_open":
      return "Opened proposal";
    case "option_view":
      return optionGroup
        ? `Viewed ${tierNames[optionGroup] || `Tier ${optionGroup}`}`
        : "Viewed option";
    case "plan_selected":
      return "Selected financing plan";
    case "calculator_open":
      return "Opened financing calculator";
    case "signature_started":
      return "Started signing";
    case "signed":
      return "Signed proposal";
    default:
      return type.replace(/_/g, " ");
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
