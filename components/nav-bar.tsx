"use client";

import { ChevronRight, DoorOpen, GraduationCap, Menu, Shield } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/components/providers/user-provider";
import { useCustomSidebar } from "./sidebar-context";

type NavBarProps = {
  variant?: "main" | "admin";
};

function getPageLabel(pathname: string, isAdminPath: boolean) {
  if (isAdminPath) {
    if (/^\/admin\/courses/.test(pathname)) return "Course management";
    if (/^\/admin\/course\/\d+/.test(pathname)) return "Course workspace";
    return "Admin workspace";
  }

  if (/^\/course\/\d+\/chat/.test(pathname)) return "Study chat";
  if (/^\/course\/\d+/.test(pathname)) return "Course workspace";
  if (pathname.startsWith("/account")) return "Account settings";
  return "My courses";
}

export default function NavBar({ variant = "main" }: NavBarProps) {
  const { toggle: toggleSidebar } = useCustomSidebar();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const isAdminPath = variant === "admin";
  const isAdmin = user?.role === "admin";
  const pageLabel = getPageLabel(pathname, isAdminPath);

  return (
    <nav
      aria-label="Application navigation"
      className="relative z-10 flex h-16 flex-shrink-0 items-center gap-2 overflow-hidden border-b border-[#f4ece2]/12 bg-[#18243a] px-3 text-[#f4ece2] shadow-[0_8px_22px_rgba(24,36,58,0.14)] sm:gap-3 sm:px-4"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 8% -120%, rgba(244,236,226,0.18), transparent 32%), radial-gradient(circle at 82% 0%, rgba(142,48,57,0.28), transparent 28%)",
        }}
      />

      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="relative flex size-10 items-center justify-center rounded-xl border border-transparent text-[#d9dfe7] transition-colors duration-150 hover:border-[#f4ece2]/12 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3aaad] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18243a]"
      >
        <Menu className="size-5" />
      </button>

      <button
        type="button"
        onClick={() => router.push(isAdminPath ? "/admin/dashboard" : "/dashboard")}
        className="relative flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3aaad]"
        aria-label="Go to dashboard"
      >
        <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-[#f4ece2] text-[#18243a] shadow-sm">
          <GraduationCap className="size-[19px]" />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-[15px] font-semibold leading-tight tracking-tight text-[#fffaf2]">
            Exam Reviewer
          </span>
          <span className="block truncate pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#c9d1dc]">
            Study studio
          </span>
        </span>
      </button>

      <div className="relative ml-1 hidden min-w-0 items-center gap-2 border-l border-[#f4ece2]/15 pl-4 lg:flex">
        <ChevronRight aria-hidden="true" className="size-3.5 text-[#aeb8c6]" />
        <span className="truncate text-[13px] font-medium text-[#d9dfe7]">{pageLabel}</span>
      </div>

      <div className="relative ml-auto flex items-center gap-2">
        {isAdmin && isAdminPath && (
          <span className="hidden items-center gap-1.5 rounded-full border border-[#e3aaad]/30 bg-[#8e3039]/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffe9e9] sm:inline-flex">
            <Shield className="size-3" />
            Admin
          </span>
        )}

        {isAdmin && isAdminPath && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#f4ece2]/15 bg-white/[0.05] px-2.5 text-[12px] font-semibold text-[#d9dfe7] transition-colors duration-150 hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3aaad] sm:px-3"
          >
            <DoorOpen className="size-4" />
            <span className="hidden sm:inline">Exit Admin</span>
          </button>
        )}

        {isAdmin && !isAdminPath && (
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#f4ece2]/15 bg-white/[0.05] px-2.5 text-[12px] font-semibold text-[#d9dfe7] transition-colors duration-150 hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3aaad] sm:px-3"
          >
            <Shield className="size-4" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        )}
      </div>
    </nav>
  );
}
