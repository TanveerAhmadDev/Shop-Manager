"use client";

import { useEffect, useState } from "react";
import {
  Download,
  CheckCircle,
  X,
  Share,
  MoreVertical,
  Smartphone,
  PlusSquare,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;

    setIsAndroid(/android/i.test(userAgent));
    setIsIOS(
      /iphone|ipad|ipod/i.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );

    const checkInstalled = () => {
      const standalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

      const iosStandalone =
        "standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

      setIsInstalled(standalone || iosStandalone);
    };

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowGuide(false);
    };

    checkInstalled();

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();

      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }

      setInstallPrompt(null);
    } catch (error) {
      console.error("Installation failed:", error);
    }
  }

  const buttonClass =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition";

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
        <CheckCircle size={17} />
        App Installed
      </span>
    );
  }

  return (
    <>
      {installPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          <Download size={17} />
          Install App
        </button>
      ) : (
        (isAndroid || isIOS) && (
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className={`${buttonClass} border border-border text-foreground hover:bg-accent`}
          >
            <Smartphone size={17} />
            How to Install
          </button>
        )
      )}

      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-guide-title"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 id="install-guide-title" className="text-lg font-bold">
                  Install Furniture Manager
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the app to your phone's home screen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent"
                aria-label="Close installation guide"
              >
                <X size={20} />
              </button>
            </div>

            {isAndroid && (
              <div className="space-y-4">
                <GuideStep
                  icon={<MoreVertical size={22} />}
                  title="Step 1: Open browser menu"
                  description="Tap the three dots in Chrome's top corner."
                />
                <GuideStep
                  icon={<Download size={22} />}
                  title="Step 2: Choose Install"
                  description='Select "Install app" or "Add to Home screen".'
                />
                <GuideStep
                  icon={<Smartphone size={22} />}
                  title="Step 3: Confirm installation"
                  description="Follow the browser instructions. Furniture Manager will appear on your home screen."
                />

                <p className="rounded-lg bg-primary/10 p-3 text-xs text-primary">
                  If your browser doesn't offer installation, open this website
                  directly in Google Chrome.
                </p>
              </div>
            )}

            {isIOS && (
              <div className="space-y-4">
                <GuideStep
                  icon={<Share size={22} />}
                  title="Step 1: Tap Share"
                  description="Open this website in Safari and tap its Share icon."
                />
                <GuideStep
                  icon={<PlusSquare size={22} />}
                  title="Step 2: Add to Home Screen"
                  description='Find "Add to Home Screen" in the Share menu.'
                />
                <GuideStep
                  icon={<Smartphone size={22} />}
                  title="Step 3: Tap Add"
                  description="Confirm to add Furniture Manager to your home screen."
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function GuideStep({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 text-primary">{icon}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
