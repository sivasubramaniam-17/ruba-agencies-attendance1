// Leaflet-free shared types + status metadata so server components (the page)
// can import these without pulling Leaflet (which touches `window`) into the
// server bundle. The map component imports the same values.

export type LiveStatus = "ON_LEAVE" | "CHECKED_OUT" | "CHECKED_IN" | "NOT_CHECKED_IN"

export interface LiveEmployee {
  user: {
    id: string
    firstName: string
    lastName: string
    employeeId: string
    department: string
  }
  status: LiveStatus
  speedKmh: number
  mode: "riding" | "walking" | "stationary"
  checkInTime: string | null
  checkOutTime: string | null
  current: {
    latitude: number
    longitude: number
    accuracy: number | null
    heading: number | null
    speed: number | null
    recordedAt: string
  }
  trail: { latitude: number; longitude: number; recordedAt: string }[]
}

// One color + label per status, reused by the pin, popup and side list.
export const STATUS_META: Record<LiveStatus, { color: string; label: string }> = {
  CHECKED_IN: { color: "#059669", label: "Checked in" },
  CHECKED_OUT: { color: "#2563eb", label: "Checked out" },
  ON_LEAVE: { color: "#d97706", label: "On leave" },
  NOT_CHECKED_IN: { color: "#6b7280", label: "Not checked in" },
}
