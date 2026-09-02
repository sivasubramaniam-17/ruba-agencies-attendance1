"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { type LiveEmployee, STATUS_META } from "@/components/admin/live-status"

// Turn a jagged set of GPS points into a flowing curve (Uber/Swiggy look) by
// interpolating a Catmull-Rom spline through them — the line passes through every
// real point but bends smoothly between them instead of drawing sharp zig-zags.
function smoothPath(pts: [number, number][], samplesPerSegment = 14): [number, number][] {
  if (pts.length < 3) return pts
  const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => {
    const t2 = t * t
    const t3 = t2 * t
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  }
  const out: [number, number][] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1]
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment
      out.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

// Metres between two lat/lng points (for grouping people who share a spot).
function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// When several employees are at (nearly) the same place their pins stack and you
// can't tell them apart. Fan each cluster out onto a small ring around the shared
// spot so every initialed pin is visible and clickable. Returns a display
// position per employee id; solo employees keep their exact position.
const CLUSTER_RADIUS_M = 45 // people within this of each other are "same spot"
const FAN_RADIUS_DEG = 0.0002 // ~22m ring the fanned pins sit on
function fanOutPositions(employees: LiveEmployee[]): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>()
  const used = new Set<string>()
  for (const e of employees) {
    if (used.has(e.user.id)) continue
    const group = [e]
    used.add(e.user.id)
    for (const o of employees) {
      if (used.has(o.user.id)) continue
      if (metersBetween(e.current.latitude, e.current.longitude, o.current.latitude, o.current.longitude) <= CLUSTER_RADIUS_M) {
        group.push(o)
        used.add(o.user.id)
      }
    }
    if (group.length === 1) {
      out.set(e.user.id, [e.current.latitude, e.current.longitude])
      continue
    }
    const cLat = group.reduce((s, g) => s + g.current.latitude, 0) / group.length
    const cLng = group.reduce((s, g) => s + g.current.longitude, 0) / group.length
    const cosLat = Math.cos((cLat * Math.PI) / 180) || 1
    group.forEach((g, i) => {
      const ang = (2 * Math.PI * i) / group.length
      out.set(g.user.id, [cLat + FAN_RADIUS_DEG * Math.cos(ang), cLng + (FAN_RADIUS_DEG * Math.sin(ang)) / cosLat])
    })
  }
  return out
}

// A marker that glides smoothly to each new position (Swiggy-style) instead of
// jumping — it interpolates lat/lng over ~1.4s whenever the target changes.
function AnimatedMarker({
  position,
  icon,
  children,
  duration = 1400,
  linear = false,
}: {
  position: [number, number]
  icon?: L.DivIcon
  children?: ReactNode
  duration?: number // glide time; short + linear for fast replay so it flows smoothly
  linear?: boolean
}) {
  const [current, setCurrent] = useState<[number, number]>(position)
  const fromRef = useRef<[number, number]>(position)

  useEffect(() => {
    const from = fromRef.current
    const to = position
    if (from[0] === to[0] && from[1] === to[1]) return
    let start: number | null = null
    let raf = 0
    const step = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = linear ? p : 1 - Math.pow(1 - p, 3)
      setCurrent([from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased])
      if (p < 1) raf = requestAnimationFrame(step)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [position, duration, linear])

  return (
    <Marker position={current} icon={icon}>
      {children}
    </Marker>
  )
}

// A Swiggy-style teardrop pin: colored map pin with the employee's initials
// and a soft pulse at the tip so live people are easy to spot.
function makeIcon(initials: string, color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:40px;height:52px">
        <span style="position:absolute;left:50%;bottom:3px;width:16px;height:16px;transform:translateX(-50%);border-radius:9999px;background:${color};opacity:.35;animation:rubaPulse 1.6s ease-out infinite"></span>
        <div style="position:absolute;left:50%;top:2px;width:34px;height:34px;margin-left:-17px;background:${color};border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.35)">
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);color:#fff;font-weight:700;font-size:12px;letter-spacing:.5px">${initials}</span>
        </div>
      </div>`,
    iconSize: [40, 52],
    iconAnchor: [20, 50], // point of the pin sits on the coordinate
    popupAnchor: [0, -46],
  })
}

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"

// Exact time (to the second) for stop arrival/departure.
const fmtExact = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

// Frame the map around everyone once on first load, and again only when someone
// NEW joins — never on a routine refresh, and never while the admin has focused a
// person (so clicking a card isn't undone by the next poll).
function FollowMap({ employees, hasFocus }: { employees: LiveEmployee[]; hasFocus: boolean }) {
  const map = useMap()
  const didFit = useRef(false)
  const prevCount = useRef(0)

  useEffect(() => {
    if (employees.length === 0) return
    const grew = employees.length > prevCount.current
    prevCount.current = employees.length
    // Fit on the very first data, or when the team grows — but not while focused.
    if (didFit.current && !(grew && !hasFocus)) return
    if (hasFocus && didFit.current) return
    didFit.current = true
    const pts = employees.map((e) => [e.current.latitude, e.current.longitude]) as [number, number][]
    if (pts.length === 1) {
      map.setView(pts[0], Math.max(map.getZoom(), 15))
    } else {
      map.fitBounds(L.latLngBounds(pts).pad(0.25))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length, hasFocus])

  // When exactly one person is live (and none focused), gently follow them.
  const only = !hasFocus && employees.length === 1 ? employees[0] : null
  const lat = only?.current.latitude
  const lng = only?.current.longitude
  useEffect(() => {
    if (lat != null && lng != null) {
      map.panTo([lat, lng], { animate: true, duration: 1 })
    }
  }, [lat, lng, map])

  return null
}

// Re-frame the map around everyone when the admin hits "Reset view". Driven by a
// changing signal so it fires on demand (not on mount).
function ResetView({ signal, employees }: { signal: number; employees: LiveEmployee[] }) {
  const map = useMap()
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (employees.length === 0) return
    const pts = employees.map((e) => [e.current.latitude, e.current.longitude]) as [number, number][]
    if (pts.length === 1) map.setView(pts[0], Math.max(map.getZoom(), 15))
    else map.fitBounds(L.latLngBounds(pts).pad(0.25))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal])
  return null
}

// Frame the map around a replay route when it first loads.
function ReplayFit({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.length ? `${points.length}:${points[0][0]},${points[0][1]}` : ""
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 15))
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

// Fly the map to a chosen employee when the admin clicks them in the side list.
function FocusEmployee({ id, positions }: { id?: string | null; positions: Map<string, [number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (!id) return
    const pos = positions.get(id)
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 17), { duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return null
}

export default function LiveTrackingMap({
  employees,
  areas = {},
  focusId,
  resetSignal = 0,
  replay,
}: {
  employees: LiveEmployee[]
  areas?: Record<string, string>
  focusId?: string | null
  resetSignal?: number
  replay?: {
    points: [number, number][]
    index: number
    label: string
    color: string
    stops?: { lat: number; lng: number; arrive: number; leave: number; minutes: number; area?: string }[]
  } | null
}) {
  const fallbackCenter: [number, number] = employees[0]
    ? [employees[0].current.latitude, employees[0].current.longitude]
    : [11.0, 78.0]

  const icons = useMemo(() => {
    const m = new Map<string, L.DivIcon>()
    for (const e of employees) {
      const initials = `${e.user.firstName?.[0] ?? ""}${e.user.lastName?.[0] ?? ""}`.toUpperCase()
      m.set(e.user.id, makeIcon(initials, STATUS_META[e.status].color))
    }
    return m
  }, [employees])

  // Fan out employees who share a location so each pin stays identifiable.
  const displayPositions = useMemo(() => fanOutPositions(employees), [employees])

  return (
    <MapContainer center={fallbackCenter} zoom={16} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      {/* Standard OpenStreetMap tiles — free, no API key required */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {replay ? (
        <>
          {/* Replay mode: draw the full route faint, the travelled part bold, and
              a marker gliding along it as the scrubber advances. */}
          <ReplayFit points={replay.points} />
          {replay.points.length > 1 && (
            <>
              <Polyline
                positions={replay.points}
                pathOptions={{ color: replay.color, weight: 4, opacity: 0.25, lineCap: "round", lineJoin: "round" }}
              />
              <Polyline
                positions={replay.points.slice(0, replay.index + 1)}
                pathOptions={{ color: replay.color, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
              />
            </>
          )}
          {/* Stop markers — where they stayed a while, with arrive/leave times. */}
          {(replay.stops ?? []).map((s, i) => (
            <Circle
              key={`stop-${i}`}
              center={[s.lat, s.lng]}
              radius={22}
              pathOptions={{ color: "#111827", weight: 2, fillColor: "#f59e0b", fillOpacity: 0.85 }}
            >
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 170 }}>
                  <div style={{ fontWeight: 700 }}>Stop {i + 1} · stayed {s.minutes} min</div>
                  {s.area && <div style={{ color: "#7c3aed", fontWeight: 600 }}>📍 {s.area}</div>}
                  <div>🟢 Arrived {fmtExact(s.arrive)}</div>
                  <div>🔴 Left {fmtExact(s.leave)}</div>
                </div>
              </Popup>
            </Circle>
          ))}
          {replay.points[replay.index] && (
            <AnimatedMarker
              position={replay.points[replay.index]}
              icon={makeIcon(replay.label, replay.color)}
              duration={160}
              linear
            />
          )}
        </>
      ) : (
        <FollowMap employees={employees} hasFocus={!!focusId} />
      )}
      {!replay && <FocusEmployee id={focusId} positions={displayPositions} />}
      {!replay && <ResetView signal={resetSignal} employees={employees} />}

      {!replay &&
        employees.map((e) => {
        const meta = STATUS_META[e.status]
        const pos: [number, number] = [e.current.latitude, e.current.longitude]
        const displayPos: [number, number] = displayPositions.get(e.user.id) ?? pos
        const rawTrail = e.trail.map((p) => [p.latitude, p.longitude]) as [number, number][]
        const trailPts = smoothPath(rawTrail)
        // Accuracy circle marks the area the employee is standing in (like the
        // blue dot in Google Maps). Cap the visual radius so a poor fix on a
        // laptop doesn't cover the whole map.
        const accuracyRadius = Math.min(e.current.accuracy ?? 30, 150)
        return (
          <div key={e.user.id}>
            {/* Only draw the path for the employee the admin has tapped — keeps
                the map neat and makes it obvious whose route this is. */}
            {focusId === e.user.id && trailPts.length > 1 && (
              <>
                {/* Soft glow underneath, then the crisp rounded line on top — a
                    smooth, flowing route like Uber/Swiggy. */}
                <Polyline
                  positions={trailPts}
                  pathOptions={{ color: meta.color, weight: 11, opacity: 0.2, lineCap: "round", lineJoin: "round" }}
                />
                <Polyline
                  positions={trailPts}
                  pathOptions={{ color: meta.color, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
                />
              </>
            )}
            <Circle
              center={pos}
              radius={accuracyRadius}
              pathOptions={{ color: meta.color, weight: 1, fillColor: meta.color, fillOpacity: 0.15 }}
            />
            {/* If this pin was fanned away from the real spot (shared location),
                draw a thin leg back to the true position so it stays clear. */}
            {displayPos[0] !== pos[0] || displayPos[1] !== pos[1] ? (
              <Polyline
                positions={[pos, displayPos]}
                pathOptions={{ color: meta.color, weight: 1.5, opacity: 0.5, dashArray: "3 4" }}
              />
            ) : null}
            <AnimatedMarker position={displayPos} icon={icons.get(e.user.id)}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                    {e.user.firstName} {e.user.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {e.user.employeeId} · {e.user.department}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      margin: "6px 0",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      background: meta.color + "22",
                      color: meta.color,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 9999, background: meta.color }} />
                    {meta.label}
                  </div>
                  {e.mode === "riding" && (
                    <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700, margin: "2px 0 4px" }}>
                      🏍️ Riding · {e.speedKmh} km/h
                    </div>
                  )}
                  {areas[e.user.id] && (
                    <div style={{ fontSize: 12, color: "#333", fontWeight: 600, margin: "2px 0 4px" }}>
                      📍 {areas[e.user.id]}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>
                    <div>In: {fmtTime(e.checkInTime)} · Out: {fmtTime(e.checkOutTime)}</div>
                    <div>Location updated {fmtTime(e.current.recordedAt)}</div>
                    {e.current.accuracy != null && <div>Accuracy ±{Math.round(e.current.accuracy)} m</div>}
                  </div>
                </div>
              </Popup>
            </AnimatedMarker>
          </div>
        )
      })}
    </MapContainer>
  )
}
