"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type SidebarContextType = {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  isMobile: false,
  toggle: () => {},
});

export function CustomSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = (matches: boolean) => {
      setIsMobile(matches);
      if (matches) setIsOpen(false);
      else setIsOpen(true);
    };
    update(mq.matches);
    const handler = (e: MediaQueryListEvent) => update(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const value = useMemo(
    () => ({ isOpen, isMobile, toggle: () => setIsOpen((s) => !s) }),
    [isOpen, isMobile]
  );
  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useCustomSidebar() {
  return useContext(SidebarContext);
}
