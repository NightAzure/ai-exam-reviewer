"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Brain, GraduationCap, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";

const AUTH_CONTENT = {
  login: {
    badge: "AI-Powered Learning",
    title: "Welcome Back",
    subtitle: "Sign in to continue your learning journey",
    heroTitle: "Master Your Exams with Intelligent Study Tools",
    legal:
      "By continuing, you agree to Exam Reviewer's Terms of Service and Privacy Policy",
    ctaTitle: "Welcome to Exam Reviewer",
    ctaSubtitle: "Your AI-powered exam review companion",
    features: [
      {
        icon: Brain,
        title: "Adaptive Learning",
        description: "Personalized study plans that adapt to your pace.",
      },
      {
        icon: BookOpen,
        title: "Smart Practice Tests",
        description: "AI-generated questions targeting your weak areas.",
      },
      {
        icon: GraduationCap,
        title: "Progress Tracking",
        description: "Monitor improvement with detailed analytics.",
      },
    ],
  },
  register: {
    badge: "AI-Powered Learning",
    title: "Create Your Account",
    subtitle: "Create your account and start achieving more",
    heroTitle: "Everything You Need to Excel in Your Exams",
    legal:
      "By creating an account, you agree to Exam Reviewer's Terms of Service and Privacy Policy",
    ctaTitle: "Join Exam Reviewer",
    ctaSubtitle: "AI-powered exam review companion",
    features: [
      {
        icon: Brain,
        title: "Smart Study Plans",
        description: "Personalized learning path tailored to your goals.",
      },
      {
        icon: BookOpen,
        title: "Interactive Practice",
        description: "Access practice questions that match your course.",
      },
      {
        icon: GraduationCap,
        title: "Track Your Growth",
        description: "Visualize progress and celebrate achievements.",
      },
    ],
  },
} as const;

function BrandPanel({
  content,
}: {
  content: (typeof AUTH_CONTENT)[keyof typeof AUTH_CONTENT];
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-ink px-10 py-12 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(139_38_53/0.55)_0%,transparent_68%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-24 top-16 size-72 rounded-full bg-oxblood/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -right-16 size-80 rounded-full bg-brass/10 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md space-y-7">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg backdrop-blur-sm">
            <GraduationCap aria-hidden="true" className="size-7 text-white" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.03em] text-pretty">
            {content.ctaTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/70">
            {content.ctaSubtitle}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
          <Sparkles aria-hidden="true" className="size-3.5 text-brass" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">
            {content.badge}
          </span>
        </div>

        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight tracking-[-0.025em] text-pretty sm:text-[1.75rem]">
          {content.heroTitle}
        </h2>

        <div className="space-y-3">
          {content.features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-oxblood/50">
                <feature.icon aria-hidden="true" className="size-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-white/60">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthFormPanel({
  isLogin,
  setIsLogin,
  authError,
  onForgotPassword,
  content,
}: {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
  authError: string | null;
  onForgotPassword: () => void;
  content: (typeof AUTH_CONTENT)[keyof typeof AUTH_CONTENT];
}) {
  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {isLogin ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.03em] text-ink text-pretty">
                {content.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate">
                {content.subtitle}
              </p>
            </div>

            <Card className="gap-0 rounded-3xl border-ink/10 bg-surface p-5 shadow-[0_18px_40px_rgb(24_36_58/0.08)] sm:p-8">
              <LoginForm
                initialError={authError}
                onForgotPassword={onForgotPassword}
              />
            </Card>

            <p className="mt-6 text-center text-xs leading-5 text-slate">
              {content.legal}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.03em] text-ink text-pretty">
                {content.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate">
                {content.subtitle}
              </p>
            </div>

            <Card className="gap-0 rounded-3xl border-ink/10 bg-surface p-5 shadow-[0_18px_40px_rgb(24_36_58/0.08)] sm:p-8">
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
            </Card>

            <p className="mt-6 text-center text-xs leading-5 text-slate">
              {content.legal}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Auth() {
  // Registration UI kept available but Microsoft SSO is the primary path.
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [authError] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("error"),
  );
  const content = isLogin ? AUTH_CONTENT.login : AUTH_CONTENT.register;

  return (
    <div>
      {/* Mobile: form only */}
      <div className="relative min-h-screen overflow-x-hidden bg-canvas lg:hidden">
        <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
          <AuthFormPanel
            isLogin={isLogin}
            setIsLogin={setIsLogin}
            authError={authError}
            onForgotPassword={() => setShowForgotPassword(true)}
            content={content}
          />
        </div>
      </div>

      {/* Desktop: form left, brand panel right */}
      <div className="relative hidden min-h-screen w-full overflow-hidden lg:flex">
        <section className="flex flex-1 items-center justify-center bg-canvas px-8 py-12">
          <AuthFormPanel
            isLogin={isLogin}
            setIsLogin={setIsLogin}
            authError={authError}
            onForgotPassword={() => setShowForgotPassword(true)}
            content={content}
          />
        </section>

        <section className="relative flex flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login-brand" : "register-brand"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <BrandPanel content={content} />
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <ForgotPasswordModal
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
}
