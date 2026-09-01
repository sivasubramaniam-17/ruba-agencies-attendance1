"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { type LiveEmployee, STATUS_META } from "@/components/admin/live-status"

// A marker that glides smoothly to each new position (Swiggy-style) instead of
// jumping — it interpolates lat/lng over ~1.4s whenever the target changes.
function AnimatedMarker({
  position,
  icon,
  children,
}: {
  position: [number, number]
  icon?: L.DivIcon
  children?: ReactNode
}) {
  const [current, setCurrent] = useState<[number, number]>(position)
  const fromRef = useRef<[number, number]>(position)

  useEffect(() => {
    const from = fromRef.current
    const to = position
    if (from[0] === to[0] && from[1] === to[1]) return
    const duration = 1400
    let start: number | null = null
    let raf = 0
    const step = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setCurrent([from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased])
      if (p < 1) raf = requestAnimationFrame(step)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [position])

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

// Keep the map framed around whoever is currently live, and smoothly follow a
// single moving employee (Swiggy-style) as their position updates.
function FollowMap({ employees }: { employees: LiveEmployee[] }) {
  const map = useMap()

  // Re-frame when the SET of live employees changes (not on every ping).
  useEffect(() => {
    if (employees.length === 0) return
    const pts = employees.map((e) => [e.current.latitude, e.current.longitude]) as [number, number][]
    if (pts.length === 1) {
      map.setView(pts[0], Math.max(map.getZoom(), 15))
    } else {
      map.fitBounds(L.latLngBounds(pts).pad(0.25))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.map((e) => e.user.id).join(",")])

  // When exactly one person is live, pan the map to follow them as they move.
  const only = employees.length === 1 ? employees[0] : null
  const lat = only?.current.latitude
  const lng = only?.current.longitude
  useEffect(() => {
    if (lat != null && lng != null) {
      map.panTo([lat, lng], { animate: true, duration: 1 })
    }
  }, [lat, lng, map])

  return null
}

export default function LiveTrackingMap({
  employees,
  areas = {},
}: {
  employees: LiveEmployee[]
  areas?: Record<string, string>
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

  return (
    <MapContainer center={fallbackCenter} zoom={16} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      {/* Standard OpenStreetMap tiles — free, no API key required */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FollowMap employees={employees} />

      {employees.map((e) => {
        const meta = STATUS_META[e.status]
        const pos: [number, number] = [e.current.latitude, e.current.longitude]
        const trailPts = e.trail.map((p) => [p.latitude, p.longitude]) as [number, number][]
        // Accuracy circle marks the area the employee is standing in (like the
        // blue dot in Google Maps). Cap the visual radius so a poor fix on a
        // laptop doesn't cover the whole map.
        const accuracyRadius = Math.min(e.current.accuracy ?? 30, 150)
        return (
          <div key={e.user.id}>
            {trailPts.length > 1 && (
              <Polyline positions={trailPts} pathOptions={{ color: meta.color, weight: 4, opacity: 0.55 }} />
            )}
            <Circle
              center={pos}
              radius={accuracyRadius}
              pathOptions={{ color: meta.color, weight: 1, fillColor: meta.color, fillOpacity: 0.15 }}
            />
            <AnimatedMarker position={pos} icon={icons.get(e.user.id)}>
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
