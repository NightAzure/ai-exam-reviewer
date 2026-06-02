"use client";
import { Menu, DoorOpen, Shield } from "lucide-react";
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
    <nav
      className="flex-shrink-0 z-10 h-[62px] flex items-center gap-3 bg-[#1c1f26]"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Left accent strip */}
      <div
        className="h-full w-[3px] flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, #dc2626 0%, #b91c1c 50%, #7f1d1d 100%)",
          boxShadow: "2px 0 8px rgba(220,38,38,0.4)",
        }}
      />

      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center w-[35px] h-[35px] rounded-lg transition-colors duration-150"
        style={{ color: "rgba(255,255,255,0.45)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
          (e.currentTarget as HTMLButtonElement).style.background = "";
        }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Brand mark */}
      <div className="flex items-center gap-3 select-none">
        <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center text-white text-[12px] font-bold tracking-tight shadow-sm">
          ER
        </div>
        <span className="hidden sm:block text-[15px] font-semibold tracking-tight" style={{ color: "#ffffff" }}>
          Exam Reviewer
        </span>
        {isAdmin && isAdminPath && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(185,28,28,0.25)",
              color: "#fca5a5",
              border: "1px solid rgba(185,28,28,0.4)",
            }}
          >
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
            className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium rounded-lg transition-colors duration-150"
            style={{
              color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
              (e.currentTarget as HTMLButtonElement).style.background = "";
            }}
          >
            <DoorOpen className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Exit Admin</span>
          </button>
        )}

        {isAdmin && !isAdminPath && (
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium rounded-lg transition-colors duration-150"
            style={{
              color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
              (e.currentTarget as HTMLButtonElement).style.background = "";
            }}
          >
            <Shield className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        )}
      </div>
    </nav>
  );
}
