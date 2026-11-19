"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function OnlineStatus() {
  const isOnline = useOnlineStatus();

  return (
    <div
      role="status"
      aria-live="polite"
      title={isOnline ? "Online" : "Offline"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
        isOnline
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
    </div>
  );
}
