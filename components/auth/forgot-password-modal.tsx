"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : undefined;

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
    });

    setIsLoading(false);

    if (res.status === 429) {
      setError("Too many requests. Please wait before trying again.");
      return;
    }

    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Something went wrong. Please try again.");
      return;
    }

    setIsSuccess(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after modal closes
    setTimeout(() => {
      setIsSuccess(false);
      setEmail("");
      setError(null);
    }, 200);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        handleClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-[28px] border-white/70 bg-white/98 p-0 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:w-full">
        {!isSuccess ? (
          <>
            <DialogHeader className="border-b border-slate-200/70 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <DialogTitle className="text-xl sm:text-2xl">
                Reset Your Password
              </DialogTitle>
              <DialogDescription>
                Enter your email and we&apos;ll send you a reset link
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-x-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </motion.div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Reset Link...
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex justify-center"
            >
              <div className="size-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="size-10 text-green-500" />
              </div>
            </motion.div>

            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold">
                Email Sent Successfully!
              </DialogTitle>
              <DialogDescription className="text-sm">
                We&apos;ve sent a password reset link to{" "}
                <strong>{email}</strong>
              </DialogDescription>
              <p className="text-xs text-muted-foreground pt-2">
                Didn&apos;t receive the email? Check your spam folder or try
                again.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                variant="default"
                className="w-full"
                onClick={handleClose}
              >
                Return to Login
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsSuccess(false)}
              >
                Try Another Email
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
