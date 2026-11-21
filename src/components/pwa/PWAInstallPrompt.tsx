"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, X, MoreVertical, Smartphone, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt({
  variant = "banner",
}: {
  variant?: "banner" | "button" | "modal";
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelperModal, setShowHelperModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    if (sessionStorage.getItem("pwa_prompt_dismissed") === "true") {
      setDismissed(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isApple);
    setIsAndroid(isAndroidDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If native prompt is captured by browser
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.error("PWA install error:", err);
      }
    }

    // If native prompt wasn't triggered yet or on specific mobile browser, show device-specific guide
    setShowHelperModal(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (isStandalone || installed) {
    return null;
  }

  if (variant === "button") {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 shadow-sm transition-all"
          title="Install as native app on Android, desktop, or iOS"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>

        {showHelperModal && (
          <DeviceInstallModal
            isAndroid={isAndroid}
            isIOS={isIOS}
            onClose={() => setShowHelperModal(false)}
          />
        )}
      </>
    );
  }

  if (dismissed) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-card to-indigo-950/40 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  Install Academic AI on Android
                </h4>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Android APK Ready
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install to your Android home screen and app drawer for fast offline access and real-time attendance calculations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install Now</span>
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showHelperModal && (
        <DeviceInstallModal
          isAndroid={isAndroid}
          isIOS={isIOS}
          onClose={() => setShowHelperModal(false)}
        />
      )}
    </>
  );
}

function DeviceInstallModal({
  isAndroid,
  isIOS,
  onClose,
}: {
  isAndroid: boolean;
  isIOS: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Smartphone className="h-5 w-5 text-primary" />
            <span>
              {isAndroid
                ? "Install on Android (Chrome)"
                : isIOS
                ? "Install on iOS (Safari)"
                : "Install Academic AI"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isAndroid ? (
          <ol className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                1
              </span>
              <span>
                In Google Chrome, tap the <strong>three dots</strong> (
                <MoreVertical className="inline h-3.5 w-3.5 mx-0.5 text-foreground" />
                ) in the top-right corner.
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                2
              </span>
              <span>
                Tap <strong>&ldquo;Install app&rdquo;</strong> (or <strong>&ldquo;Add to Home screen&rdquo;</strong>).
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                3
              </span>
              <span>
                Tap <strong>Install</strong> when prompted. Chrome will create a standalone app with its own icon in your Android app drawer!
              </span>
            </li>
          </ol>
        ) : isIOS ? (
          <ol className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                1
              </span>
              <span>
                Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 mx-0.5" /> at the bottom of Safari.
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                2
              </span>
              <span>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                3
              </span>
              <span>
                Tap <strong>Add</strong> in the top right.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                1
              </span>
              <span>
                Click the <strong>Install</strong> icon (⊕ or ⬇) in your Chrome/Edge browser address bar.
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                2
              </span>
              <span>
                Confirm <strong>Install</strong> to add Academic AI as a native desktop application.
              </span>
            </li>
          </ol>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
