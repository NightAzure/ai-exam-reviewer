"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AlertCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

interface LoginFormProps {
  initialError?: string | null;
  onForgotPassword?: () => void;
}

export function LoginForm({ initialError = null, onForgotPassword }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const router = useRouter();
  const supabase = createClient();
  const isBusy = isLoading || isMicrosoftLoading;

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  const handleMicrosoftLogin = async () => {
    setError(null);
    setIsMicrosoftLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microsoft sign-in failed unexpectedly.");
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  const signInWithCredentials = async (signInEmail: string, signInPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const auth = supabase.auth;
      if (!auth?.signInWithPassword) {
        setError("Sign-in is unavailable. Check Supabase URL and API key in .env.local.");
        return;
      }

      const { error } = await auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed unexpectedly.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithCredentials(email, password);
  };

  const handleDemoStudentLogin = async () => {
    setEmail("student@gmail.com");
    setPassword("student123");
    await signInWithCredentials("student@gmail.com", "student123");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Button
        type="button"
        variant="outline"
        onClick={handleMicrosoftLogin}
        disabled={isBusy}
        className="mb-1 flex h-11 w-full items-center justify-center gap-3 border-ink/15 bg-surface text-ink hover:bg-ink/[0.04]"
      >
        <Image src="/Microsoft.svg" alt="" width={20} height={20} aria-hidden="true" />
        <span>
          {isMicrosoftLoading ? "Connecting to Microsoft…" : "Sign In with Microsoft"}
        </span>
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-ink/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 font-semibold uppercase tracking-[0.12em] text-slate">
            Or
          </span>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-ink">
          Email address
        </Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate"
          />
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password" className="text-sm font-medium text-ink">
            Password
          </Label>
          {onForgotPassword ? (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs font-medium text-oxblood underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/40 rounded"
            >
              Forgot password?
            </button>
          ) : null}
        </div>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate"
          />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password…"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-12"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-9 min-h-9 min-w-9 -translate-y-1/2"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4 text-slate" />
            ) : (
              <Eye aria-hidden="true" className="size-4 text-slate" />
            )}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isBusy}>
        {isLoading ? "Signing in…" : "Sign In"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={isBusy}
        onClick={handleDemoStudentLogin}
      >
        <GraduationCap aria-hidden="true" className="size-4" />
        Login as Student (Demo)
      </Button>
    </form>
  );
}
