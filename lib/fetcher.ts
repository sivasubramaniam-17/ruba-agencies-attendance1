// Shared fetcher for SWR. Throws on non-2xx so SWR surfaces an error
// while preserving the same JSON shape each route already returns.
export async function fetcher<T = any>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const error: any = new Error("An error occurred while fetching the data.")
    try {
      error.info = await res.json()
    } catch {
      error.info = null
    }
    error.status = res.status
    throw error
  }
  return res.json()
}
