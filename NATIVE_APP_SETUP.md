# Ruba Attendance — Native Android App (background location)

This wraps the existing web app in a native Android shell (Capacitor) so location
keeps posting while the app is **minimized or the screen is off** via a foreground
service. It loads your deployed site, so all pages/APIs work unchanged.

> ⚠️ Free-plugin limit: force-clearing the app from recents can still stop tracking
> (that needs the paid `@transistorsoft` plugin). Background + screen-off works.

---

## 1. Prerequisites (one time, on your Mac)
- **Android Studio** (includes the Android SDK) — https://developer.android.com/studio
- **Java JDK 17** (Android Studio bundles one)
- Your app **deployed** (Vercel) and login working there.

## 2. Point the app at your live site
Edit **`capacitor.config.ts`** → set `server.url` to your **production** URL, e.g.:
```ts
url: "https://ruba-agencies-attendance1.vercel.app",
```

## 3. Generate the Android project (run in the project folder)
```bash
npx cap add android      # creates the native android/ project (needs Android SDK)
npx cap sync             # copies config + installs the plugin natively
npx cap open android     # opens the project in Android Studio
```

## 4. Build the APK
In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
Or from the terminal:
```bash
cd android && ./gradlew assembleDebug
# APK output: android/app/build/outputs/apk/debug/app-debug.apk
```
Send that `.apk` to employees (WhatsApp/Drive) and have them install it
(they may need to allow "Install unknown apps" for the file source).

## 5. On each employee phone (REQUIRED for background tracking)
1. Open the app, log in.
2. When it asks for Location, choose **"Allow all the time"** (not "While using").
3. **Xiaomi / Redmi / POCO (MIUI) — critical, or the phone kills the app:**
   - Settings → Apps → **Ruba Attendance** → **Autostart: ON**
   - Battery saver for this app → **No restrictions**
   - Recent apps → long-press the app → **lock** it (padlock) so "clear all" skips it
   - (Same idea on Oppo/Vivo/Realme/Samsung: disable battery optimization for the app.)
4. Toggle **"Share my live location"** on the dashboard. A persistent
   "Sharing your live location" notification appears — that means it's working.

## 6. Updating later
The app loads your live site, so **web/UI changes deploy automatically** (just
push to Vercel — no rebuild needed). Rebuild the APK only if you change native
config or the Capacitor plugins.

---

## How auth works
The native app loads your deployed site and shares its login session (cookies),
so background location posts to the same `/api/location` endpoint, authenticated
as the logged-in employee — exactly like the web version, but it keeps running
in the background.
