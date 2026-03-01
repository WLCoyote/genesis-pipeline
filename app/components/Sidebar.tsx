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
  { href: "/dashboard/quote-builder", label: "New Quote", roles: ["admin", "comfort_pro"] },
  { href: "/dashboard/leads", label: "Leads", roles: ["admin", "csr"] },
  { href: "/dashboard/inbox", label: "Inbox", roles: ["admin", "csr"] },
  { href: "/dashboard/admin", label: "Overview", roles: ["admin"] },
  { href: "/dashboard/admin/sequences", label: "Sequences", roles: ["admin"] },
  { href: "/dashboard/admin/pricebook", label: "Pricebook", roles: ["admin"] },
  { href: "/dashboard/admin/quote-templates", label: "Templates", roles: ["admin"] },
  { href: "/dashboard/admin/financing-plans", label: "Financing Plans", roles: ["admin"] },
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
        className={`fixed top-0 left-0 z-50 h-full w-[200px] bg-ds-sidebar border-r border-[#1a3050] flex flex-col transition-transform md:translate-x-0 md:static md:z-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1a3050]">
          <h1 className="font-display text-xl font-black tracking-[2px] uppercase text-white">
            Genesis
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-body">
            {userName} &middot; {roleLabels[role]}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
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
                className={`block px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-[rgba(21,101,192,0.25)] text-white border-l-[3px] border-l-ds-blue-lt"
                    : "text-white/50 hover:bg-white/5 hover:text-white/85"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-[#1a3050]">
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
