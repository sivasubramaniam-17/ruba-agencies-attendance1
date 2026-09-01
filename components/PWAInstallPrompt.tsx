"use client";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";

// Stable download link — the CI publishes the APK to this "app-latest" release
// on every build, so this URL always points at the newest app.
const APK_URL =
  "https://github.com/sivasubramaniam-17/ruba-agencies-attendance1/releases/download/app-latest/app-debug.apk";

export default function AppDownloadButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // No point offering the download when already inside the native app.
    if (Capacitor.isNativePlatform()) return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        asChild
        size="sm"
        className="shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
      >
        <a href={APK_URL} download="RubaAttendance.apk" target="_blank" rel="noopener noreferrer">
          📱 Install App
        </a>
      </Button>
    </div>
  );
}
