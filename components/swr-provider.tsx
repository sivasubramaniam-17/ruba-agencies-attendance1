"use client"

import type React from "react"
import { SWRConfig } from "swr"
import { fetcher } from "@/lib/fetcher"

// Global SWR configuration. Dedupes identical requests fired within a short
// window (e.g. multiple components asking for the same endpoint on one screen)
// and caches responses across navigations so going back to a page doesn't
// refetch from scratch. Revalidation on focus/reconnect keeps data fresh.
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 5000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        keepPreviousData: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}
