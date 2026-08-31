"use client"

import { useEffect, useRef, useState } from "react"

// Smoothly animates a number from its previous value to the new one
// (easeOutCubic) — the little "count up" flourish on the bento stat cards.
export function CountUp({
  value,
  duration = 900,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return
    let raf = 0
    let start: number | null = null
    const tick = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
