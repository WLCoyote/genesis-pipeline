"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface MobileProfileProps {
  name: string;
  email: string;
  role: string;
  phone: string | null;
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  comfort_pro: "Comfort Pro",
  csr: "CSR",
};

export default function MobileProfile({ name, email, role, phone }: MobileProfileProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="px-4 py-3">
      <h1 className="font-display text-lg font-semibold text-ds-text dark:text-gray-100 mb-4">
        Profile
      </h1>

      {/* User card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        {/* Avatar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1565c0] to-[#1e88e5] flex items-center justify-center text-white text-lg font-bold">
            {name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")}
          </div>
          <div>
            <div className="font-semibold text-ds-text dark:text-gray-100">{name}</div>
            <div className="text-xs text-ds-gray">{roleLabels[role] || role}</div>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-ds-gray">Email</label>
            <div className="text-sm text-ds-text dark:text-gray-100">{email}</div>
          </div>
          {phone && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-ds-gray">Phone</label>
              <div className="text-sm text-ds-text dark:text-gray-100">{phone}</div>
            </div>
          )}
        </div>
      </div>

      {/* Links */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
        <Link
          href="/dashboard/estimates"
          className="flex items-center justify-between px-4 py-3 text-sm text-ds-text dark:text-gray-100 no-underline border-b border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-750"
        >
          <span>Switch to Desktop View</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold cursor-pointer active:bg-red-100"
      >
        Sign Out
      </button>
    </div>
  );
}
