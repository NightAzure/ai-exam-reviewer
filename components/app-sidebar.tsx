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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsActive } from "@/utils/activePath";
import { useMyCourses } from "@/hooks/use-my-courses";
import { useCustomSidebar } from "./sidebar-context";
import { useSidebarThreads } from "@/hooks/use-sidebar-threads";
import { useUser } from "@/components/providers/user-provider";
import { createClient } from "@/utils/supabase/client";
import { clearSWRCache } from "@/lib/swr-cache";

const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 72;

// Palette
const BG = "#1c1f26";
const DIVIDER = "rgba(255,255,255,0.07)";
const TEXT_PRIMARY = "#ffffff";
const TEXT_MUTED = "rgba(255,255,255,0.45)";
const TEXT_SECTION = "rgba(255,255,255,0.3)";
const ACTIVE_BG = "rgba(185,28,28,0.2)";
const HOVER_BG = "rgba(255,255,255,0.06)";

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
      className={`flex flex-col overflow-hidden z-50 ${isMobile ? "fixed bottom-0 left-0" : "relative flex-shrink-0 h-full"}`}
      style={{
        background: BG,
        borderRight: `1px solid ${DIVIDER}`,
        top: isMobile ? "62px" : undefined,
      }}
    >
      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
        <AnimatePresence>
          {isOpen && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: TEXT_SECTION }}
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
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={
                  isActive("/dashboard")
                    ? { background: ACTIVE_BG, color: TEXT_PRIMARY }
                    : { color: TEXT_MUTED }
                }
                onMouseEnter={(e) => {
                  if (!isActive("/dashboard")) {
                    (e.currentTarget as HTMLButtonElement).style.background = HOVER_BG;
                    (e.currentTarget as HTMLButtonElement).style.color = TEXT_PRIMARY;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/dashboard")) {
                    (e.currentTarget as HTMLButtonElement).style.background = "";
                    (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
                  }
                }}
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
                    <div className="pl-3 flex flex-col gap-1 border-l" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                      {(courses ?? []).map((course) => (
                        <button
                          key={course.id}
                          onClick={() => !isActive("/course/" + course.id) && router.push("/course/" + course.id)}
                          className="w-full text-left text-[13px] px-3 py-2.5 rounded-md truncate transition-all duration-150"
                          style={
                            isActive("/course/" + course.id)
                              ? { background: ACTIVE_BG, color: TEXT_PRIMARY }
                              : { color: TEXT_MUTED }
                          }
                          onMouseEnter={(e) => {
                            if (!isActive("/course/" + course.id)) {
                              (e.currentTarget as HTMLButtonElement).style.background = HOVER_BG;
                              (e.currentTarget as HTMLButtonElement).style.color = TEXT_PRIMARY;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive("/course/" + course.id)) {
                              (e.currentTarget as HTMLButtonElement).style.background = "";
                              (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
                            }
                          }}
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
            <div className="mx-4 h-px mb-3" style={{ background: DIVIDER }} />
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_SECTION }}>
              Threads
            </p>
            <div className="px-2 flex flex-col gap-0.5">
              <button
                onClick={newThread}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 mb-1"
                style={{ color: TEXT_MUTED, border: "1px dashed rgba(255,255,255,0.15)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = HOVER_BG;
                  (e.currentTarget as HTMLButtonElement).style.color = TEXT_PRIMARY;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "";
                  (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
                }}
              >
                <PlusIcon className="w-4 h-4 flex-shrink-0" />
                New Thread
              </button>
              {threads.map((thread) => {
                const isActiveThread = thread.id === Number(activeChatId);
                return (
                  <div
                    key={thread.id}
                    className="flex items-center rounded-lg group overflow-hidden"
                    style={isActiveThread ? { background: ACTIVE_BG } : {}}
                  >
                    <button
                      className="flex-1 min-w-0 px-3 py-2.5 text-left text-[13px] truncate transition-all duration-150"
                      style={{ color: isActiveThread ? TEXT_PRIMARY : TEXT_MUTED }}
                      onClick={() => navigateTo(thread.id)}
                      onMouseEnter={(e) => {
                        if (!isActiveThread) {
                          (e.currentTarget as HTMLButtonElement).style.color = TEXT_PRIMARY;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActiveThread) {
                          (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
                        }
                      }}
                    >
                      {thread.title || "New Chat"}
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 mr-1 rounded transition-opacity duration-150"
                      style={{ color: TEXT_MUTED }}
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(thread.id); }}
                      title="Delete thread"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
                      }}
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-base">Delete this thread?</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                All messages in this thread will be permanently removed. This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              onClick={() => setPendingDeleteId(null)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "#e5e7eb", color: "#374151", background: "#ffffff" }}
              onMouseEnter={(e) => { if (!isDeleting) (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ffffff"; }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 disabled:cursor-not-allowed"
              style={{ background: isDeleting ? "#b91c1c" : "#dc2626", color: "#ffffff" }}
              onMouseEnter={(e) => { if (!isDeleting) (e.currentTarget as HTMLButtonElement).style.background = "#b91c1c"; }}
              onMouseLeave={(e) => { if (!isDeleting) (e.currentTarget as HTMLButtonElement).style.background = "#dc2626"; }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete thread"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User footer */}
      <div className="flex-shrink-0 px-3 py-4" style={{ borderTop: `1px solid ${DIVIDER}` }}>
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full bg-red-700 flex-shrink-0 flex items-center justify-center text-white text-[13px] font-bold select-none cursor-pointer"
              onClick={() => router.push("/account")}
            >
              {initials || <User className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push("/account")}>
              <p className="text-[14px] font-semibold truncate leading-tight" style={{ color: TEXT_PRIMARY }}>
                {fullName || "Account"}
              </p>
              {role && (
                <p className="text-[12px] truncate mt-0.5" style={{ color: TEXT_MUTED }}>
                  {role}
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
              style={{ color: TEXT_MUTED }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(185,28,28,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
                (e.currentTarget as HTMLButtonElement).style.background = "";
              }}
            >
              <DoorOpen className="h-[17px] w-[17px]" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/account")}
              title={fullName || "Account"}
              className="h-9 w-9 rounded-full bg-red-700 flex items-center justify-center text-white text-[13px] font-bold select-none"
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
      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium transition-all duration-150"
      style={
        active
          ? { background: ACTIVE_BG, color: TEXT_PRIMARY }
          : { color: TEXT_MUTED }
      }
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = HOVER_BG;
          (e.currentTarget as HTMLButtonElement).style.color = TEXT_PRIMARY;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "";
          (e.currentTarget as HTMLButtonElement).style.color = TEXT_MUTED;
        }
      }}
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
