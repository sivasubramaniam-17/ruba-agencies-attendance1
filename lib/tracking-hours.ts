// Live tracking is only allowed during the day (06:00–22:00 IST). After 10 PM
// it turns off automatically and resumes at 6 AM. Computed in IST regardless of
// the server's timezone (Vercel runs in UTC).

export const TRACKING_START_HOUR = 6 // 06:00
export const TRACKING_END_HOUR = 22 // 22:00 (10 PM)

export function isWithinTrackingHours(date: Date = new Date()): boolean {
  // Minutes since midnight in IST (UTC + 5:30).
  const istMinutes = (date.getUTCHours() * 60 + date.getUTCMinutes() + 330) % 1440
  return istMinutes >= TRACKING_START_HOUR * 60 && istMinutes < TRACKING_END_HOUR * 60
}
