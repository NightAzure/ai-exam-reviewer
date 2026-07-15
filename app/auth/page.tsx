"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";
import { Button } from "@/components/ui/button";

export default function Auth() {
  // Registration UI kept available but Microsoft SSO is the primary path.
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [authError] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("error"),
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ink text-white shadow-sm">
            <GraduationCap aria-hidden="true" className="size-7" />
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
            Exam Reviewer
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink text-pretty">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate">
            {isLogin
              ? "Sign in to continue your review workspace."
              : "Set up your account to keep coursework and practice in one place."}
          </p>
        </div>

        <Card className="gap-0 rounded-3xl border-ink/10 bg-surface p-5 shadow-[0_18px_40px_rgb(24_36_58/0.08)] sm:p-8">
          {isLogin ? (
            <LoginForm
              initialError={authError}
              onForgotPassword={() => setShowForgotPassword(true)}
            />
          ) : (
            <>
              <RegisterForm />
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-ink/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-surface px-2 text-slate">
                    Already have an account?
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsLogin(true)}
              >
                Sign In
              </Button>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-xs leading-5 text-slate">
          By continuing, you agree to Exam Reviewer&apos;s Terms of Service and
          Privacy Policy.
        </p>
      </div>

      <ForgotPasswordModal
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
}
