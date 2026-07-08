"use client";
import { Menu, DoorOpen, Shield, GraduationCap } from "lucide-react";
import { useCustomSidebar } from "./sidebar-context";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/providers/user-provider";

type NavBarProps = {
  variant?: "main" | "admin";
};

export default function NavBar({ variant = "main" }: NavBarProps) {
  const { toggle: toggleSidebar } = useCustomSidebar();
  const { user } = useUser();
  const router = useRouter();
  const isAdminPath = variant === "admin";
  const isAdmin = user?.role === "admin";

  return (
    <nav className="flex-shrink-0 z-10 h-[62px] flex items-center gap-3 bg-shell border-b border-shell-border">
      {/* Left accent strip */}
      <div
        className="h-full w-[3px] flex-shrink-0 bg-gradient-to-b from-brand via-brand-strong to-brand-strong/60"
        style={{ boxShadow: "2px 0 8px oklch(0.577 0.245 27.325 / 40%)" }}
      />

      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="flex items-center justify-center w-[35px] h-[35px] rounded-lg text-shell-muted transition-colors duration-150 hover:text-shell-foreground hover:bg-shell-hover"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Brand mark */}
      <div className="flex items-center gap-3 select-none">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-strong flex items-center justify-center text-white shadow-sm">
          <GraduationCap className="w-[18px] h-[18px]" />
        </div>
        <span className="hidden sm:block text-[15px] font-semibold tracking-tight text-shell-foreground">
          Exam Reviewer
        </span>
        {isAdmin && isAdminPath && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-brand-strong/25 text-red-300 border border-brand-strong/40">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1 pr-3.5">
        {isAdmin && isAdminPath && (
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium rounded-lg text-shell-muted border border-white/10 transition-colors duration-150 hover:text-shell-foreground hover:bg-shell-hover"
          >
            <DoorOpen className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Exit Admin</span>
          </button>
        )}

        {isAdmin && !isAdminPath && (
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium rounded-lg text-shell-muted border border-white/10 transition-colors duration-150 hover:text-shell-foreground hover:bg-shell-hover"
          >
            <Shield className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        )}
      </div>
    </nav>
  );
}
