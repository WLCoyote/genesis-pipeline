"use client";

import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, maxWidth = "max-w-lg", children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${maxWidth} mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          {title && (
            <h2 className="text-lg font-display font-normal text-ds-text dark:text-gray-100 mb-4">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
