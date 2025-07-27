import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAInstallButton from "@/components/pwainstallbutton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ruba Agencies - Attendance Management",
  description:
    "Professional mobile-first attendance management system with real-time tracking",
  manifest: "/manifest.json", // Changed from .webmanifest to .json for better compatibility
  applicationName: "Ruba Attendance", // Added for better PWA support
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      url: "/icons/icon-192x192.png",
      sizes: "192x192",
    },
    {
      rel: "icon",
      url: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ruba Attendance",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Ruba Agencies",
    title: "Attendance Management System",
    description: "Professional mobile-first attendance management system",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8b5cf6",
  viewportFit: "cover",
  // Add interactiveWidget for better PWA behavior
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Preload important resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Add splash screens for iOS */}
        <link
          rel="apple-touch-startup-image"
          href="/splashscreens/iphone5_splash.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
        />
        {/* Add more splash screens as needed */}
      </head>
      <body
        className={`${inter.className} h-full bg-gradient-to-br from-violet-50 via-white to-purple-50`}
      >
        <AuthProvider>
          {children}
          <PWAInstallButton />
          <Toaster />
          <PWAInstallPrompt /> {/* Fixed: Now used as standalone component */}
        </AuthProvider>
      </body>
    </html>
  );
}
