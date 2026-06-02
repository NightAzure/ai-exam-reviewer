/** Call on logout so a different user doesn't see stale cached SWR data. */
export function clearSWRCache() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("swr-cache-v1");
  }
}
