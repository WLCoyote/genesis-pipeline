"use client";

import { useEffect, useState } from "react";
import StatCard from "@/app/components/ui/StatCard";

interface Stats {
  total: number;
  active: number;
  totalSent: number;
  avgOpen: number;
  avgClick: number;
  totalUnsubscribes: number;
}

export default function CampaignStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/campaigns/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard label="Total Campaigns" value={(stats.total ?? 0).toString()} />
      <StatCard label="Active" value={(stats.active ?? 0).toString()} color="green" />
      <StatCard label="Emails Sent" value={(stats.totalSent ?? 0).toLocaleString()} color="blue" />
      <StatCard label="Avg Open Rate" value={`${stats.avgOpen ?? 0}%`} color="blue" />
      <StatCard label="Avg Click Rate" value={`${stats.avgClick ?? 0}%`} color="green" />
      <StatCard label="Unsubscribes" value={(stats.totalUnsubscribes ?? 0).toLocaleString()} color="orange" />
    </div>
  );
}
