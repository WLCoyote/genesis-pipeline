"use client";

import { SegmentFilter, CampaignType } from "@/lib/campaign-types";
import AudienceBuilder from "./AudienceBuilder";
import Card from "@/app/components/ui/Card";

interface Props {
  filter: SegmentFilter;
  onChange: (f: SegmentFilter) => void;
  campaignType: CampaignType;
  excludeActivePipeline: boolean;
  onExcludeActivePipelineChange: (v: boolean) => void;
  excludeRecentContactDays: number | null;
  onExcludeRecentContactDaysChange: (v: number | null) => void;
}

export default function CampaignAudienceStep({
  filter,
  onChange,
  campaignType,
  excludeActivePipeline,
  onExcludeActivePipelineChange,
  excludeRecentContactDays,
  onExcludeRecentContactDaysChange,
}: Props) {
  return (
    <Card title="Target Audience">
      <AudienceBuilder
        filter={filter}
        onChange={onChange}
        campaignType={campaignType}
        excludeActivePipeline={excludeActivePipeline}
        onExcludeActivePipelineChange={onExcludeActivePipelineChange}
        excludeRecentContactDays={excludeRecentContactDays}
        onExcludeRecentContactDaysChange={onExcludeRecentContactDaysChange}
      />
    </Card>
  );
}
