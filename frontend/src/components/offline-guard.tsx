"use client";

import { useEffect } from "react";

export default function OfflineGuard() {
  useEffect(() => {
    function handleOffline() {
      if (window.location.pathname === "/offline.html") {
        return;
      }

      const currentPath = window.location.pathname + window.location.search;

      window.location.replace(
        `/offline.html?returnTo=${encodeURIComponent(currentPath)}`,
      );
    }

    function handleOnline() {
      if (window.location.pathname === "/offline.html") {
        return;
      }
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check connection when the application first loads.
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
