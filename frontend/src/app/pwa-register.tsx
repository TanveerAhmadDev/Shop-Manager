"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    async function registerServiceWorker() {
      try {
        // Register the service worker without using the browser's HTTP cache
        // when checking for service-worker script updates.
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });

        // Explicitly check for a newer service worker.
        await registration.update();

        console.log("PWA service worker registered:", registration.scope);

        console.log("Active service worker:", registration.active?.scriptURL);
      } catch (error) {
        console.error("PWA service worker registration failed:", error);
      }
    }

    registerServiceWorker();
  }, []);

  return null;
}
