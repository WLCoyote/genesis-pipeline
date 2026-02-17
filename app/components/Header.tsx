"use client";

import NotificationBell from "./NotificationBell";
import DarkModeToggle from "./DarkModeToggle";

interface HeaderProps {
  userId: string;
  onMenuToggle: () => void;
}

export default function Header({ userId, onMenuToggle }: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-4 gap-3">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <DarkModeToggle />
      <NotificationBell userId={userId} />
    </header>
  );
}
