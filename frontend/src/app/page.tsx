"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getOfflineSession } from "@/lib/offline-db";

const VISITED_KEY = "furniture_manager_visited";

interface MeResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
    };
  };
}

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkVisitor() {
      try {
        // First check the server authentication.
        const result = await apiRequest<MeResponse>("/auth/me");

        if (!isMounted) return;

        if (result.success) {
          router.replace("/dashboard");
          return;
        }
      } catch (error) {
        // If the server cannot be reached, check offline authentication.
        const isNetworkError = !navigator.onLine || error instanceof TypeError;

        if (isNetworkError) {
          try {
            const cachedUser = await getOfflineSession();

            if (!isMounted) return;

            if (cachedUser) {
              router.replace("/dashboard");
              return;
            }
          } catch (offlineError) {
            console.error("Offline session error:", offlineError);
          }
        }
      }

      if (!isMounted) return;

      // No authenticated session: check whether this browser has visited.
      const hasVisited = localStorage.getItem(VISITED_KEY);

      if (hasVisited) {
        router.replace("/login");
      } else {
        localStorage.setItem(VISITED_KEY, "true");
        router.replace("/landing");
      }
    }

    checkVisitor();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />

        <p className="mt-4 text-sm text-muted-foreground">
          Loading Furniture Manager...
        </p>
      </div>
    </div>
  );
}
