"use client";

import { useState } from "react";
import { UserRole } from "@/lib/types";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import MobileRedirect from "@/app/components/MobileRedirect";

interface DashboardShellProps {
  role: UserRole;
  userName: string;
  userId: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  role,
  userName,
  userId,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-ds-bg dark:bg-gray-900">
      {role === "comfort_pro" && <MobileRedirect />}
      <Sidebar
        role={role}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userId={userId} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
