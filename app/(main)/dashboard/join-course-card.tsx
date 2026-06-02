"use client";

import { useRef, useEffect, useState } from "react";
import { mutate } from "swr";
import { Plus, X, ArrowRight, Loader2, Clock } from "lucide-react";

export default function JoinCourseCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending" | "active">("idle");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isExpanded]);

  const close = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
    setCode("");
    setError("");
    setJoinStatus("idle");
  };

  const resetCard = () => {
    setIsExpanded(false);
    setJoinStatus("idle");
    setCode("");
  };

  const handleJoin = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (!code.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/course/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode: code.toUpperCase() }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({})) as { status?: string };
        if (body.status === "pending") {
          setJoinStatus("pending");
        } else {
          await mutate("my-courses");
          setIsExpanded(false);
          setCode("");
          setJoinStatus("idle");
        }
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Invalid code. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleJoin(e);
    if (e.key === "Escape") { setIsExpanded(false); setCode(""); setError(""); }
  };

  return (
    <div
      className={`rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-500 min-h-[240px] h-full group
        ${isExpanded
          ? "border border-primary/20 shadow-md bg-card cursor-default"
          : "border border-primary/20 hover:border-primary/30 bg-muted/50 hover:bg-muted cursor-pointer shadow-sm"
        }`}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {/* Grid background */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${isExpanded ? "opacity-0" : "opacity-100"}`}
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Morphing circle */}
      <div
        className={`absolute bg-card transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-0
          ${isExpanded
            ? "w-[150%] h-[150%] rounded-[100px]"
            : "w-20 h-20 rounded-full shadow-sm border border-border group-hover:-translate-y-1 group-hover:shadow-md"
          }`}
      />

      {/* Dashed ring */}
      <div
        className={`absolute w-[72px] h-[72px] rounded-full border-2 border-dashed transition-all duration-500 z-10
          ${isExpanded
            ? "opacity-0 scale-150 border-border"
            : "opacity-100 border-border group-hover:border-foreground/40 group-hover:rotate-90 group-hover:-translate-y-1"
          }`}
      />

      {/* Plus icon */}
      <Plus
        className={`absolute z-10 transition-all duration-500
          ${isExpanded
            ? "opacity-0 scale-0 text-foreground/40"
            : "opacity-100 text-foreground/40 group-hover:text-foreground/70 group-hover:-translate-y-1"
          }`}
        strokeWidth={2}
        size={28}
      />

      {/* Collapsed label */}
      <span
        className={`absolute bottom-8 text-xl font-semibold transition-all duration-500 z-10
          ${isExpanded
            ? "opacity-0 translate-y-8 pointer-events-none"
            : "opacity-100 text-foreground/50 group-hover:text-foreground/80"
          }`}
      >
        Join a Class
      </span>

      {/* Pending success state */}
      <div
        className={`absolute z-20 w-full px-6 flex flex-col items-center gap-3 text-center transition-all duration-300
          ${isExpanded && joinStatus === "pending" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="font-semibold text-sm text-foreground">Request sent</p>
        <p className="text-xs text-muted-foreground">Waiting for the instructor to accept your request.</p>
        <button
          onClick={resetCard}
          className="text-xs text-muted-foreground underline underline-offset-2 mt-1"
        >
          Dismiss
        </button>
      </div>

      {/* Expanded form */}
      <div
        className={`relative z-20 w-full px-6 flex flex-col gap-4 transition-all duration-300 delay-150
          ${isExpanded && joinStatus === "idle" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-foreground">
              Join a Class
            </span>
            <span className="text-xs text-muted-foreground">Enter the code given by your instructor</span>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-full text-foreground/40 hover:text-foreground hover:bg-foreground/8 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col w-full">
          <div className={`flex items-center w-full border overflow-hidden transition-all duration-200
            ${error
              ? "rounded-t-lg border-destructive/40"
              : "rounded-lg border-border focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-foreground/8"
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. ABC12345"
              className={`flex-1 border-none outline-none text-foreground placeholder:text-foreground/30 px-4 py-2.5 text-sm font-medium tracking-wide transition-colors duration-200
                ${error ? "bg-destructive/10" : "bg-background"}`}
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={handleKeyDown}
              maxLength={20}
            />
            <button
              onClick={handleJoin}
              disabled={code.length < 2 || isLoading}
              className="px-3 py-2.5 bg-background border-l border-border text-foreground/40 hover:text-foreground hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-30 transition-all"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowRight className="w-4 h-4" />
              }
            </button>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? "max-h-12 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="bg-destructive border border-t-0 border-destructive/40 rounded-b-lg px-4 py-2">
              <p className="text-sm font-medium text-white">{error}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
