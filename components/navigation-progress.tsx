"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    // Clear any running timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (completeRef.current) clearTimeout(completeRef.current);

    // Complete the bar on arrival (deferred so React doesn't cascade renders)
    completeRef.current = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 0);
  }, [pathname]);

  // Intercept link clicks to start the bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto")) return;

      if (timerRef.current) clearInterval(timerRef.current);
      if (completeRef.current) clearTimeout(completeRef.current);

      setProgress(0);
      setVisible(true);

      // Fake progress that slows down near 85%
      let current = 0;
      timerRef.current = setInterval(() => {
        current += Math.random() * 12 * (1 - current / 100);
        if (current >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          current = 85;
        }
        setProgress(Math.min(current, 85));
      }, 80);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      style={{ opacity: visible || progress > 0 ? 1 : 0 }}
    >
      <div
        className="h-full bg-red-600"
        style={{
          width: `${progress}%`,
          transition: progress === 100
            ? "width 0.15s ease-out"
            : "width 0.08s linear",
          boxShadow: "0 0 6px rgba(185,28,28,0.6)",
        }}
      />
    </div>
  );
}
