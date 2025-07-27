"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button"; // Assuming you're using shadcn/ui

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);

      // For debugging:
      console.log("PWA install prompt available");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if the app is already installed
    window.addEventListener("appinstalled", () => {
      console.log("PWA was installed");
      setIsVisible(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User ${outcome} the install prompt`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <Button
        onClick={handleInstallClick}
        className="shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
      >
        Install App
      </Button>
    </div>
  );
}
