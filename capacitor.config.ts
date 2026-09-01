import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.rubaagencies.attendance",
  appName: "Ruba Attendance",
  // Local placeholder shell. The app actually loads your deployed site below.
  webDir: "native-shell",
  server: {
    // The native app loads your deployed Next.js app so all pages/APIs work.
    // >>> UPDATE this to your real production URL after Vercel deploy succeeds. <<<
    url: "https://ruba-agencies-attendance1.vercel.app",
    cleartext: false,
  },
  plugins: {
    // Foreground-service notification shown while location sharing is active.
    BackgroundGeolocation: {},
  },
}

export default config
