"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Auto-redirects comfort_pro users to /m/ on mobile devices.
 * Checks localStorage for "stay_desktop" override so they can opt out.
 * Only rendered for comfort_pro role in DashboardShell.
 */
export default function MobileRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Skip if user explicitly chose to stay on desktop
    if (localStorage.getItem("stay_desktop") === "1") return;

    // Simple mobile check: screen width < 768px
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      router.replace("/m/pipeline");
    }
  }, [router]);

  return null;
}
