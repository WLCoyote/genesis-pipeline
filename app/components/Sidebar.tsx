"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import SignOutButton from "./SignOutButton";

interface SidebarProps {
  role: UserRole;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { href: "/dashboard/estimates", label: "Estimates", roles: ["admin", "comfort_pro", "csr"] },
  { href: "/dashboard/leads", label: "Leads", roles: ["admin", "csr"] },
  { href: "/dashboard/inbox", label: "Inbox", roles: ["admin", "csr"] },
  { href: "/dashboard/admin", label: "Overview", roles: ["admin"] },
  { href: "/dashboard/admin/sequences", label: "Sequences", roles: ["admin"] },
  { href: "/dashboard/admin/pricebook", label: "Pricebook", roles: ["admin"] },
  { href: "/dashboard/admin/settings", label: "Settings", roles: ["admin"] },
  { href: "/dashboard/admin/team", label: "Team", roles: ["admin"] },
  { href: "/dashboard/import", label: "Import CSV", roles: ["admin"] },
];

export default function Sidebar({ role, userName, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const roleLabels: Record<UserRole, string> = {
    admin: "Admin",
    comfort_pro: "Comfort Pro",
    csr: "CSR",
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform md:translate-x-0 md:static md:z-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Genesis Pipeline</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {userName} &middot; {roleLabels[role]}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href + "/") &&
                !visibleItems.some(
                  (other) =>
                    other.href.length > item.href.length &&
                    pathname.startsWith(other.href)
                ));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
