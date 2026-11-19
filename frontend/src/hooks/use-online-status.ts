"use client";

import { useEffect, useState } from "react";

export function useOnlineStatus() {
  // Start with true to avoid server/client hydration mismatch.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Get the actual browser connection status.
    setIsOnline(navigator.onLine);

    // Update status when connection changes.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Remove listeners when component unmounts.
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
