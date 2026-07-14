"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  Lightbulb,
  ChevronDown,
  Grid2X2,
  Settings,
  BookOpen,
  PlusIcon,
  Trash2,
  User,
  DoorOpen,
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

const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 72;

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
        "flex flex-col overflow-hidden z-50 bg-shell border-r border-shell-border",
        isMobile ? "fixed bottom-0 left-0 top-[62px]" : "relative flex-shrink-0 h-full",
      )}
    >
      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
        <AnimatePresence>
          {isOpen && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-widest text-shell-faint"
            >
              Menu
            </motion.p>
          )}
        </AnimatePresence>

        <nav className="flex flex-col gap-1 px-3">
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
            <div>
              <button
                onClick={() => !isActive("/dashboard") && router.push("/dashboard")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive("/dashboard")
                    ? "bg-shell-active text-shell-foreground"
                    : "text-shell-muted hover:bg-shell-hover hover:text-shell-foreground",
                )}
                title={!isOpen ? "Courses" : undefined}
              >
                <BookOpen className="w-[18px] h-[18px] flex-shrink-0" />
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 text-left truncate overflow-hidden"
                    >
                      Courses
                    </motion.span>
                  )}
                </AnimatePresence>
                {isOpen && (
                  <motion.span
                    className="ml-auto"
                    animate={{ rotate: sidebarCoursesOpen ? 180 : 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!inCoursePath) setCoursesOpen((s) => !s);
                    }}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {sidebarCoursesOpen && isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                    className="overflow-hidden ml-4 mt-0.5"
                  >
                    <div className="pl-3 flex flex-col gap-1 border-l border-white/10">
                      {(courses ?? []).map((course) => (
                        <button
                          key={course.id}
                          onClick={() => !isActive("/course/" + course.id) && router.push("/course/" + course.id)}
                          className={cn(
                            "w-full text-left text-[13px] px-3 py-2.5 rounded-md truncate transition-colors duration-150",
                            isActive("/course/" + course.id)
                              ? "bg-shell-active text-shell-foreground"
                              : "text-shell-muted hover:bg-shell-hover hover:text-shell-foreground",
                          )}
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
          <div className="mt-2">
            <div className="mx-4 h-px mb-3 bg-shell-border" />
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-widest text-shell-faint">
              Threads
            </p>
            <div className="px-2 flex flex-col gap-0.5">
              <button
                onClick={newThread}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium mb-1 text-shell-muted border border-dashed border-white/15 transition-colors duration-150 hover:bg-shell-hover hover:text-shell-foreground"
              >
                <PlusIcon className="w-4 h-4 flex-shrink-0" />
                New Thread
              </button>
              {threads.map((thread) => {
                const isActiveThread = thread.id === Number(activeChatId);
                return (
                  <div
                    key={thread.id}
                    className={cn(
                      "flex items-center rounded-lg group overflow-hidden",
                      isActiveThread && "bg-shell-active",
                    )}
                  >
                    <button
                      className={cn(
                        "flex-1 min-w-0 px-3 py-2.5 text-left text-[13px] truncate transition-colors duration-150",
                        isActiveThread
                          ? "text-shell-foreground"
                          : "text-shell-muted hover:text-shell-foreground",
                      )}
                      onClick={() => navigateTo(thread.id)}
                    >
                      {thread.title || "New Chat"}
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 mr-1 rounded text-shell-muted transition-[opacity,color] duration-150 hover:text-red-300"
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
      <div className="flex-shrink-0 px-3 py-4 border-t border-shell-border">
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full bg-gradient-to-br from-brand to-brand-strong flex-shrink-0 flex items-center justify-center text-white text-[13px] font-bold select-none cursor-pointer"
              onClick={() => router.push("/account")}
            >
              {initials || <User className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push("/account")}>
              <p className="text-[14px] font-semibold truncate leading-tight text-shell-foreground">
                {fullName || "Account"}
              </p>
              {role && (
                <p className="text-[12px] truncate mt-0.5 text-shell-muted">
                  {role}
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-shell-muted transition-colors duration-150 hover:text-red-300 hover:bg-brand-strong/15"
            >
              <DoorOpen className="h-[17px] w-[17px]" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/account")}
              title={fullName || "Account"}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-brand to-brand-strong flex items-center justify-center text-white text-[13px] font-bold select-none"
            >
              {initials || <User className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

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
      onClick={onClick}
      title={collapsed ? tooltip : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium transition-colors duration-150",
        active
          ? "bg-shell-active text-shell-foreground"
          : "text-shell-muted hover:bg-shell-hover hover:text-shell-foreground",
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
