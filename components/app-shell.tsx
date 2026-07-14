"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { CustomSidebarProvider, useCustomSidebar } from "./sidebar-context";
import { AppSidebar } from "./app-sidebar";
import { NavigationProgress } from "./navigation-progress";
import NavBar from "./nav-bar";

// Thin component so only the navbar re-renders on pathname change, not AppShell.
function AppNavBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return null;
  const variant = pathname.startsWith("/admin") ? "admin" : "main";
  return <NavBar variant={variant} />;
}

function MobileBackdrop() {
  const { isMobile, isOpen, toggle } = useCustomSidebar();
  if (!isMobile || !isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-[#18243a]/60 backdrop-blur-[1px]"
      style={{ top: "64px" }}
      onClick={toggle}
    />
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CustomSidebarProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* NavBar spans full width above both sidebar and content */}
        <AppNavBar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AppSidebar />
          <MobileBackdrop />
          <div className="relative flex flex-col flex-1 min-w-0 min-h-0 overflow-auto">
            <NavigationProgress />
            {children}
          </div>
        </div>
      </div>
    </CustomSidebarProvider>
  );
}
