"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(
        "Password updated successfully. You can close this page and sign in again.",
      );
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
              Account Security
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
              Set a New Password
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate">
              Choose a new password for your account.
            </p>
          </div>

          <Card className="gap-0 rounded-3xl border-ink/10 bg-surface p-5 shadow-[0_18px_40px_rgb(24_36_58/0.08)] sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              {success ? (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-proficient/20 bg-proficient/10 p-3 text-sm text-proficient"
                >
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <p>{success}</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-ink">
                  New password
                </Label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-10 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-9 min-h-9 min-w-9 -translate-y-1/2"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="size-4 text-slate" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4 text-slate" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-ink">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate"
                  />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="pl-10 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-9 min-h-9 min-w-9 -translate-y-1/2"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff aria-hidden="true" className="size-4 text-slate" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4 text-slate" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating password…" : "Update Password"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
