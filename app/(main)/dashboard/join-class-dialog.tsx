"use client";

import { useState } from "react";
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
}

export default function JoinClassDialog({
  onJoinSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
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
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Join Class
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center">
            <Tag className="w-4 h-4 mr-2" />
            Join a Class
          </DialogTitle>
          <DialogDescription>
            Enter the class code provided by your instructor to join the class.
          </DialogDescription>
        </DialogHeader>

        {joinStatus === "pending" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm text-foreground">Request sent</p>
              <p className="text-xs text-muted-foreground">Waiting for the instructor to accept your request.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { resetForm(); setIsOpen(false); }} className="mt-1">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="class-code">Class Code</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="class-code"
                    placeholder="e.g. ABC123"
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
                  />
                </div>
                {error && (
                  <div className="flex items-center text-destructive text-sm mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                  </div>
                )}
              </div>

              <Button
                onClick={handleJoinClass}
                disabled={!classCode.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Join Class
                  </>
                )}
              </Button>
            </div>

            <div className="pt-3 border-t text-center">
              <p className="text-xs text-muted-foreground mb-1">Need help?</p>
              <p className="text-xs text-muted-foreground">
                Contact your instructor for the class code.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
