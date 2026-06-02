"use client";

import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Don't refetch just because the user clicked back to the tab.
        revalidateOnFocus: false,

        // Refetch when network comes back online.
        revalidateOnReconnect: true,

        // Deduplicate identical requests fired within 4 s (e.g. two components
        // mounting at the same time both calling useMyCourses).
        dedupingInterval: 4000,

        // Retry up to 3 times on network errors.
        errorRetryCount: 3,

        // Keep showing previous data while the new key's data is loading
        // (e.g. switching between course pages avoids a blank flash).
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
