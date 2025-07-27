"use client";
import { useEffect, useState } from "react";

export default function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // 1. Check if PWA is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) return;

    // 2. Check basic PWA requirements
    const hasManifest = document.querySelector('link[rel="manifest"]');
    const hasServiceWorker = 'serviceWorker' in navigator;
    const isLocalhost = window.location.hostname === 'localhost';
    
    if (!hasManifest || !hasServiceWorker) {
      console.error('Missing PWA requirements:',
        hasManifest ? '' : 'manifest.json',
        hasServiceWorker ? '' : 'Service Worker'
      );
      return;
    }

    // 3. Listen for install prompt (or force in dev)
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Development fallback
    if (process.env.NODE_ENV === 'development' && isLocalhost) {
      setCanInstall(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) {
      alert('For production: This would trigger PWA install');
      return;
    }
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User ${outcome} the install`);
    setCanInstall(outcome !== 'accepted');
  };

  if (!canInstall) return null;

  return (
    <button 
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
    >
      Install App
    </button>
  );
}