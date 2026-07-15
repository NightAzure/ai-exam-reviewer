"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Settings,
  BookOpen,
  PlusIcon,
  Trash2,
  User,
  LogOut,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsActive } from "@/utils/activePath";
import { useMyCourses } from "@/hooks/use-my-courses";
import { useCustomSidebar } from "./sidebar-context";
import { useSidebarThreads } from "@/hooks/use-sidebar-threads";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/utils/supabase/client";
import { clearSWRCache } from "@/lib/swr-cache";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 296;
const COLLAPSED_WIDTH = 80;

const supabase = createClient();

export const AppSidebar = React.memo(function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = useIsActive();
  const { data: courses } = useMyCourses();
  const { isOpen, isMobile } = useCustomSidebar();
  const { threads, courseId, activeChatId, navigateTo, newThread, deleteThread } = useSidebarThreads();
  const { user } = useUser();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initials = (user?.first_name?.[0] ?? "") + (user?.second_name?.[0] ?? "");
  const fullName = [user?.first_name, user?.second_name].filter(Boolean).join(" ");
  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";
  const accountName = fullName || user?.username || "Signed-in student";

  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    clearSWRCache();
    router.push("/auth");
  };

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return;
    setIsDeleting(true);
    await deleteThread(pendingDeleteId);
    setIsDeleting(false);
    setPendingDeleteId(null);
  };

  const inCoursePath = /^\/course\/\d+($|\/.*)/.test(pathname);
  const [coursesOpen, setCoursesOpen] = useState(inCoursePath);

  const variant: "main" | "admin" = pathname.startsWith("/admin") ? "admin" : "main";

  // Don't render sidebar on auth routes
  if (pathname.startsWith("/auth")) return null;
  const sidebarCoursesOpen = inCoursePath || coursesOpen;

  return (
    <motion.aside
      animate={
        isMobile
          ? { x: isOpen ? 0 : -SIDEBAR_WIDTH, width: SIDEBAR_WIDTH }
          : { width: isOpen ? SIDEBAR_WIDTH : COLLAPSED_WIDTH, x: 0 }
      }
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "z-50 flex flex-col overflow-hidden border-r border-canvas/10 bg-ink-raised text-canvas shadow-[8px_0_24px_rgba(24,36,58,0.08)]",
        isMobile ? "fixed bottom-0 left-0 top-16" : "relative flex-shrink-0 h-full",
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#273754]/45 to-transparent" />

      {/* Nav */}
      <div className={cn("relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide", isOpen ? "py-5" : "py-4")}>
        <AnimatePresence>
          {isOpen && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-2 px-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#aeb8c6]"
            >
              Workspace
            </motion.p>
          )}
        </AnimatePresence>

        {!isOpen && <div aria-hidden="true" className="mx-auto mb-2 h-px w-8 bg-canvas/15" />}

        <nav className={cn("flex flex-col gap-1.5 px-3", !isOpen && "items-center gap-3 px-0")}>
          {variant === "admin" && (
            <>
              <NavItem
                icon={<Grid2X2 className="w-[18px] h-[18px] flex-shrink-0" />}
                label="Dashboard"
                active={isActive("/admin/dashboard")}
                collapsed={!isOpen}
                onClick={() => !isActive("/admin/dashboard") && router.push("/admin/dashboard")}
                tooltip="Dashboard"
              />
              <NavItem
                icon={<Lightbulb className="w-[18px] h-[18px] flex-shrink-0" />}
                label="Courses"
                active={isActive("/admin/courses")}
                collapsed={!isOpen}
                onClick={() => !isActive("/admin/courses") && router.push("/admin/courses")}
                tooltip="Courses"
              />
            </>
          )}

          {variant === "main" && (
            <div className={cn("w-full", !isOpen && "flex justify-center")}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => !isActive("/dashboard") && router.push("/dashboard")}
                  className={cn(
                    "relative flex items-center gap-3 font-semibold transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]",
                    isOpen
                      ? "min-w-0 flex-1 rounded-xl px-3 py-3 text-sm"
                      : "size-12 justify-center rounded-2xl p-0",
                    isActive("/dashboard")
                      ? "bg-oxblood text-[#fffaf2] shadow-[0_5px_16px_rgba(142,48,57,0.3)] ring-1 ring-[#e3aaad]/20"
                      : "text-[#c9d1dc] hover:bg-canvas/[0.08] hover:text-white",
                  )}
                  title={!isOpen ? "Courses" : undefined}
                  aria-label={!isOpen ? "Courses" : undefined}
                  aria-current={isActive("/dashboard") ? "page" : undefined}
                >
                  <BookOpen className="size-[18px] flex-shrink-0" strokeWidth={1.8} />
                  <AnimatePresence>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex-1 overflow-hidden text-left truncate"
                      >
                        Courses
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                {isOpen && (
                  <button
                    type="button"
                    aria-label={sidebarCoursesOpen ? "Collapse course list" : "Expand course list"}
                    aria-expanded={sidebarCoursesOpen}
                    disabled={inCoursePath}
                    onClick={() => setCoursesOpen((open) => !open)}
                    className={cn(
                      "-ml-10 z-10 mr-1 flex size-8 items-center justify-center rounded-lg text-[#c9d1dc] transition-colors hover:bg-canvas/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)] disabled:cursor-default disabled:hover:bg-transparent",
                      isActive("/dashboard") && "text-[#fffaf2]",
                    )}
                  >
                    <motion.span
                      animate={{ rotate: sidebarCoursesOpen ? 180 : 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <ChevronDown className="size-3.5" />
                    </motion.span>
                  </button>
                )}
              </div>

              <AnimatePresence initial={false}>
                {sidebarCoursesOpen && isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                    className="ml-5 mt-1 overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 border-l border-canvas/12 pl-3">
                      {(courses ?? []).map((course) => (
                        <button
                          type="button"
                          key={course.id}
                          onClick={() => !isActive("/course/" + course.id) && router.push("/course/" + course.id)}
                          className={cn(
                            "w-full truncate rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]",
                            isActive("/course/" + course.id)
                              ? "bg-white/[0.12] text-[#fffaf2]"
                              : "text-[#b8c2d1] hover:bg-white/[0.07] hover:text-white",
                          )}
                          aria-current={isActive("/course/" + course.id) ? "page" : undefined}
                        >
                          {course.title}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {variant === "main" && (
            <NavItem
              icon={<Settings className="w-[18px] h-[18px] flex-shrink-0" />}
              label="Settings"
              active={isActive("/account")}
              collapsed={!isOpen}
              onClick={() => !isActive("/account") && router.push("/account")}
              tooltip="Settings"
            />
          )}
        </nav>

        {/* Threads — shown on any /course/[id] route */}
        {courseId !== null && isOpen && (
          <div className="mt-3">
            <div className="mx-5 mb-4 h-px bg-canvas/10" />
            <p className="mb-2 px-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#aeb8c6]">
              Threads
            </p>
            <div className="flex flex-col gap-1 px-3">
              <button
                type="button"
                onClick={newThread}
                className="mb-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-canvas/25 px-3 py-2.5 text-[13px] font-semibold text-[#d9dfe7] transition-colors duration-150 hover:border-canvas/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
              >
                <PlusIcon className="size-4 flex-shrink-0" />
                New Thread
              </button>
              {threads.map((thread) => {
                const isActiveThread = thread.id === Number(activeChatId);
                return (
                  <div
                    key={thread.id}
                    className={cn(
                      "group flex items-center overflow-hidden rounded-xl",
                      isActiveThread && "bg-oxblood/65 shadow-[0_3px_10px_rgba(12,20,34,0.16)]",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "min-w-0 flex-1 truncate px-3 py-2.5 text-left text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]",
                        isActiveThread
                          ? "text-[#fffaf2]"
                          : "text-[#b8c2d1] hover:bg-white/[0.07] hover:text-white",
                      )}
                      onClick={() => navigateTo(thread.id)}
                    >
                      {thread.title || "New Chat"}
                    </button>
                    <button
                      type="button"
                      className="mr-1 flex-shrink-0 rounded-lg p-1.5 text-[#b8c2d1] opacity-0 transition-[opacity,color,background-color] duration-150 hover:bg-white/[0.1] hover:text-[#f5b7bd] group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(thread.id); }}
                      title="Delete thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete thread confirmation */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open && !isDeleting) setPendingDeleteId(null); }}
      >
        <DialogContent showCloseButton={!isDeleting} className="sm:max-w-sm">
          <div className="flex flex-col items-center gap-4 pt-2 pb-1 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-base">Delete this thread?</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                All messages in this thread will be permanently removed. This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setPendingDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete thread"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User footer */}
      <footer className="relative flex-shrink-0 border-t border-canvas/10 bg-[var(--shell-depth)]/70 p-3">
        {isOpen ? (
          <div className="flex items-center rounded-2xl border border-canvas/10 bg-white/[0.055] p-1.5 shadow-[0_8px_18px_rgba(10,18,31,0.16)]">
            <button
              type="button"
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
              onClick={() => router.push("/account")}
              aria-label="Open account settings"
            >
              <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#b94a54] to-[#80303b] text-[13px] font-bold text-white shadow-[0_3px_10px_rgba(128,48,59,0.38)]">
                {initials || <User className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold leading-tight text-[#fffaf2]">
                  {accountName}
                </span>
                <span className="mt-1 block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#aeb8c6]">
                  {role || "Student"}
                </span>
              </span>
              <ChevronRight className="size-4 flex-shrink-0 text-[#93a0b2] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#e3aaad]" />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-transparent text-[#aeb8c6] transition-colors duration-150 hover:border-[#e3aaad]/15 hover:bg-oxblood/25 hover:text-[#f9c8cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/account")}
              title={accountName}
              aria-label="Open account settings"
              className="group relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#b94a54] to-[#80303b] text-[13px] font-bold text-white shadow-[0_5px_16px_rgba(128,48,59,0.38)] transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
            >
              {initials || <User className="size-4" />}
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#142037] bg-[#c9d8a4]" />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="flex size-9 items-center justify-center rounded-xl text-[#93a0b2] transition-colors hover:bg-white/[0.08] hover:text-[#f9c8cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </footer>

    </motion.aside>
  );
});


type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  tooltip: string;
};

function NavItem({ icon, label, active, collapsed, onClick, tooltip }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? tooltip : undefined}
      aria-label={collapsed ? tooltip : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 font-semibold transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]",
        collapsed
          ? "size-12 justify-center rounded-2xl p-0"
          : "w-full rounded-xl px-3 py-3 text-[14px]",
        active
          ? "bg-oxblood text-[#fffaf2] shadow-[0_5px_16px_rgba(142,48,57,0.3)] ring-1 ring-[#e3aaad]/20"
          : "text-[#c9d1dc] hover:bg-canvas/[0.08] hover:text-white",
      )}
    >
      {icon}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="truncate overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
