import type React from "react"

// Consistent gradient hero strip used at the top of every page — gives the
// whole app a cohesive, modern feel and works from mobile to desktop.
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string
  subtitle?: string
  icon?: React.ElementType
  actions?: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-lg shadow-violet-500/20 sm:p-6">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 right-20 h-28 w-28 rounded-full bg-fuchsia-300/20 blur-2xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-violet-100/90">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
