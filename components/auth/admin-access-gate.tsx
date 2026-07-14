"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useUser } from "@/components/providers/user-provider";

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role !== "admin") {
      router.replace(`/dashboard?from=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, pathname, router, user?.role]);

  if (isLoading || user?.role !== "admin") {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin" />
          Checking admin access...
        </div>
      </div>
    );
  }

  return children;
}
