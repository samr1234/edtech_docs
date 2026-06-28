"use client";

import { useEffect, useState } from "react";
import { type SyncStatus } from "@/lib/sync-engine";
import { clsx } from "clsx";

interface StatusBarProps {
  syncStatus: SyncStatus;
  pendingCount: number;
}

const statusConfig: Record<SyncStatus, { label: string; dotClass: string }> = {
  synced: { label: "Synced", dotClass: "bg-green-500" },
  syncing: { label: "Syncing…", dotClass: "bg-yellow-400" },
  offline: { label: "Offline", dotClass: "bg-red-500" },
  error: { label: "Sync error", dotClass: "bg-red-500" },
  reconnecting: { label: "Reconnecting…", dotClass: "bg-yellow-400" },
  idle: { label: "Ready", dotClass: "bg-green-500" },
};

export function StatusBar({ syncStatus, pendingCount }: StatusBarProps) {
  const { label, dotClass } = statusConfig[syncStatus];
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <span
          className={clsx("w-2 h-2 rounded-full inline-block", dotClass)}
        />
        <span>{label}</span>
        {pendingCount > 0 && (
          <span className="text-gray-400">({pendingCount} pending)</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={clsx(
            "w-1.5 h-1.5 rounded-full inline-block",
            isOnline === null ? "bg-gray-300" : isOnline ? "bg-green-400" : "bg-red-400"
          )}
        />
        <span>
          {isOnline === null ? "" : isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}
