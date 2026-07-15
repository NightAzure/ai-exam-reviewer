"use client";

import { useState, type ReactNode } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Tag, ArrowRight, AlertCircle, Clock } from "lucide-react";

interface JoinClassDialogProps {
  onJoinSuccess?: (classCode: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}

export default function JoinClassDialog({
  onJoinSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: JoinClassDialogProps) {
  const [classCode, setClassCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending">("idle");
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = setControlledOpen ?? setInternalOpen;

  const validateClassCode = (code: string): string => {
    if (!code.trim()) {
      return "Class code is required";
    }
    if (code.length < 6) {
      return "Class code must be at least 6 characters";
    }
    if (!/^[A-Z0-9]+$/i.test(code)) {
      return "Class code can only contain letters and numbers";
    }
    return "";
  };

  const handleJoinClass = async (): Promise<void> => {
    if (isLoading) return;

    const validationError = validateClassCode(classCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/course/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ classCode: classCode.toUpperCase() }),
      });

      if (response.ok) {
        const data = await response.json() as { status?: string };
        if (data.status === "pending") {
          setJoinStatus("pending");
        } else {
          await mutate("my-courses");
          onJoinSuccess?.(classCode.toUpperCase());
          setClassCode("");
          setIsOpen(false);
        }
      } else {
        const errorData = await response.json();
        setError(
          errorData.message || "Invalid class code. Please check and try again."
        );
      }
    } catch {
      setError(
        "Failed to join class. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.toUpperCase();
    setClassCode(value);
    if (error) setError("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter" && !isLoading && classCode.trim()) {
      handleJoinClass();
    }
  };

  const resetForm = (): void => {
    setClassCode("");
    setError("");
    setIsLoading(false);
    setJoinStatus("idle");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}
    >
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Join Class
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="rounded-3xl border-ink/10 bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center font-[family-name:var(--font-display)] text-xl text-ink">
            <Tag aria-hidden="true" className="mr-2 size-4 text-oxblood" />
            Join a Class
          </DialogTitle>
          <DialogDescription className="text-slate">
            Enter the 6-character code from your instructor.
          </DialogDescription>
        </DialogHeader>

        {joinStatus === "pending" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-evidence/10">
              <Clock aria-hidden="true" className="size-6 text-evidence" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">Request sent</p>
              <p className="text-xs leading-5 text-slate">
                Waiting for the instructor to accept your request.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              className="mt-1"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="class-code" className="text-ink">
                  Class code
                </Label>
                <div className="relative">
                  <Tag
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate"
                  />
                  <Input
                    id="class-code"
                    name="class-code"
                    placeholder="e.g. ABC123…"
                    value={classCode}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    className={`pl-10 text-center font-mono tracking-wider ${
                      error
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    maxLength={20}
                    autoComplete="off"
                    inputMode="text"
                    aria-describedby={error ? "class-code-error" : undefined}
                  />
                </div>
                {error ? (
                  <div
                    id="class-code-error"
                    role="alert"
                    className="mt-1 flex items-center text-sm text-destructive"
                  >
                    <AlertCircle aria-hidden="true" className="mr-1 size-4" />
                    {error}
                  </div>
                ) : null}
              </div>

              <Button
                onClick={handleJoinClass}
                disabled={!classCode.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
                    Joining…
                  </>
                ) : (
                  <>
                    <ArrowRight aria-hidden="true" className="mr-2 size-4" />
                    Join Class
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-ink/10 pt-3 text-center">
              <p className="mb-1 text-xs text-slate">Need help?</p>
              <p className="text-xs text-slate">
                Contact your instructor for the class code.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
