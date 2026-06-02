"use client";
import { usePathname } from "next/navigation";

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = /^\/course\/\d+\/chat(\/|$)/.test(pathname);

  return isChat ? (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {children}
    </div>
  ) : (
    <div className="bg-[#f2f6f7] flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-8">
      {children}
    </div>
  );
}
