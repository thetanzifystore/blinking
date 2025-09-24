"use client";

import React, { useEffect, useRef } from "react";

type ToastProps = {
  message: string;
  open: boolean;
  onClose: () => void;
  autoHideMs?: number;
};

export default function Toast({ message, open, onClose, autoHideMs = 4000 }: ToastProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // focus the dismiss button so keyboard users land inside the toast
    const t = setTimeout(() => closeRef.current?.focus(), 0);
    const timer = setTimeout(() => onClose(), autoHideMs);
    return () => {
      clearTimeout(timer);
      clearTimeout(t);
    };
  }, [open, autoHideMs, onClose]);

  if (!open) return null;

  return (
    <div aria-live="polite" role="status" className="fixed right-4 bottom-4 z-50">
      <div className="flex items-center gap-3 rounded bg-slate-900 text-white px-4 py-2 shadow-lg">
        <div className="text-sm">{message}</div>
        <button
          ref={closeRef}
          onClick={onClose}
          className="ml-2 rounded px-2 py-1 text-xs font-medium underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
