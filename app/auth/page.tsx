"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, BookOpen, GraduationCap } from "lucide-react";
import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ForgotPasswordModal } from "@/components/auth/forgot-password-modal";

const AUTH_CONTENT = {
  login: {
    badge: "AI-Powered Learning",
    title: "Welcome Back",
    subtitle: "Sign in to continue your learning journey",
    heroTitle: "Master Your Exams with Intelligent Study Tools",
    heroDescription:
      "Review smarter with guided coursework, adaptive practice, and progress tracking that stays readable on every screen.",
    legal:
      "By continuing, you agree to Exam Reviewer's Terms of Service and Privacy Policy",
    ctaTitle: "Welcome to Exam Reviewer",
    ctaSubtitle: "Your AI-powered exam review companion",
    features: [
      {
        icon: Brain,
        title: "Adaptive Learning",
        description: "Personalized study plans that adapt to your pace",
      },
      {
        icon: BookOpen,
        title: "Smart Practice Tests",
        description: "AI-generated questions targeting your weak areas",
      },
      {
        icon: GraduationCap,
        title: "Progress Tracking",
        description: "Monitor improvement with detailed analytics",
      },
    ],
  },
  register: {
    badge: "AI-Powered Learning",
    title: "Create Your Account",
    subtitle: "Create your account and start achieving more",
    heroTitle: "Everything You Need to Excel in Your Exams",
    heroDescription:
      "Set up your account once and keep your review workflow consistent across desktop, tablet, and phone.",
    legal:
      "By creating an account, you agree to Exam Reviewer's Terms of Service and Privacy Policy",
    ctaTitle: "Register to Exam Reviewer",
    ctaSubtitle: "AI-powered exam review companion",
    features: [
      {
        icon: Brain,
        title: "Smart Study Plans",
        description: "Personalized learning path tailored to your goals",
      },
      {
        icon: BookOpen,
        title: "Interactive Practice",
        description: "Access various practice questions",
      },
      {
        icon: GraduationCap,
        title: "Track Your Growth",
        description: "Visualize progress and celebrate achievements",
      },
    ],
  },
} as const;

export default function Auth() {
  //HIDE REGISTER FORM FOR NOW
  const [isLogin, setIsLogin] = useState(true); // toggle login/register
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [authError] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("error"),
  );
  const content = isLogin ? AUTH_CONTENT.login : AUTH_CONTENT.register;

  return (
    <div>
      <div className="relative min-h-screen overflow-x-hidden bg-page lg:hidden">
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-6">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 flex items-center justify-center"
          >
            <div className="w-full max-w-xl">
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="mb-4 px-1 text-center mt-20">
                      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                        Welcome Back
                      </h1>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Sign in to continue your learning journey.
                      </p>
                    </div>

                    <Card className="gap-0 rounded-[28px] border-white/70 bg-white/95 p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.25)] sm:p-8">
                      <LoginForm
                        initialError={authError}
                        onForgotPassword={() => setShowForgotPassword(true)}
                      />
                    </Card>

                    <p className="mt-4 px-1 text-center text-xs leading-5 text-slate-500 sm:mt-6">
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
                    <div className="mb-4 px-1">
                      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                        Create Your Account
                      </h1>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Create your account and start reviewing on any device.
                      </p>
                    </div>

                    <Card className="gap-0 rounded-[28px] border-white/70 bg-white/95 p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.25)] sm:p-8">
                      <RegisterForm />

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            Already have an account?
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="h-11 w-full"
                        onClick={() => setIsLogin(true)}
                      >
                        Sign In
                      </Button>
                    </Card>

                    <p className="mt-4 px-1 text-center text-xs leading-5 text-slate-500 sm:mt-6">
                      {content.legal}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </div>
      </div>

      <div className="relative hidden min-h-screen w-full overflow-hidden bg-page lg:flex">
        <motion.div
          animate={{
            x: isLogin ? "0%" : "100%",
          }}
          transition={{
            duration: 0.8,
            ease: [0.45, 0, 0.25, 1],
          }}
          className="flex flex-1 items-center justify-center bg-background p-8 shadow-xl z-0"
        >
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="desktop-login"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Sign in to continue your learning journey
                    </p>
                  </div>

                  <Card className="p-8 gap-0">
                    <LoginForm
                      initialError={authError}
                      onForgotPassword={() => setShowForgotPassword(true)}
                    />
                  </Card>

                  <p className="text-center text-xs text-muted-foreground mt-6">
                    By continuing, you agree to Exam Reviewer&apos;s Terms of Service and Privacy Policy
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="desktop-register"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold tracking-tight">Create Your Account</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Create your account and start achieving more
                    </p>
                  </div>

                  <Card className="p-8 gap-0">
                    <RegisterForm />

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Already have an account?
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full h-11"
                      onClick={() => setIsLogin(true)}
                    >
                      Sign In
                    </Button>
                  </Card>

                  <p className="text-center text-xs text-muted-foreground mt-6">
                    By creating an account, you agree to Exam Reviewer&apos;s Terms of Service and Privacy Policy
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          animate={{
            x: isLogin ? "0%" : "-100%",
          }}
          transition={{
            duration: 0.5,
            ease: [0.45, 0, 0.25, 1],
          }}
          className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-950 p-8 text-white z-10"
        >
          <div className="max-w-md space-y-6">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="desktop-login-showcase"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center size-16 rounded-xl bg-white/10 backdrop-blur-sm mb-4 shadow-lg">
                      <GraduationCap className="size-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Exam Reviewer</h1>
                    <p className="text-sm text-white/70">
                      Your AI-powered exam review companion
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                    <Sparkles className="size-4" />
                    <span className="text-xs font-medium">AI-Powered Learning</span>
                  </div>

                  <h2 className="text-2xl font-bold leading-tight">
                    Master Your Exams with Intelligent Study Tools
                  </h2>

                  <div className="space-y-3">
                    {[
                      {
                        icon: Brain,
                        title: "Adaptive Learning",
                        description:
                          "Personalized study plans that adapt to your pace",
                      },
                      {
                        icon: BookOpen,
                        title: "Smart Practice Tests",
                        description:
                          "AI-generated questions targeting your weak areas",
                      },
                      {
                        icon: GraduationCap,
                        title: "Progress Tracking",
                        description:
                          "Monitor improvement with detailed analytics",
                      },
                    ].map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10"
                      >
                        <div className="size-8 rounded-lg bg-red-800/50 flex items-center justify-center shrink-0">
                          <feature.icon className="size-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                          <p className="text-xs text-white/60">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="desktop-register-showcase"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center size-16 rounded-xl bg-white/10 backdrop-blur-sm mb-4 shadow-lg">
                      <GraduationCap className="size-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Register to Exam Reviewer</h1>
                    <p className="text-sm text-white/70">
                      AI-powered exam review companion
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                    <Sparkles className="size-4" />
                    <span className="text-xs font-medium">AI-Powered Learning</span>
                  </div>

                  <h2 className="text-2xl font-bold leading-tight">
                    Everything You Need to Excel in Your Exams
                  </h2>

                  <div className="space-y-3">
                    {[
                      {
                        icon: Brain,
                        title: "Smart Study Plans",
                        description:
                          "Personalized learning path tailored to your goals",
                      },
                      {
                        icon: BookOpen,
                        title: "Interactive Practice",
                        description:
                          "Access various practice questions",
                      },
                      {
                        icon: GraduationCap,
                        title: "Track Your Growth",
                        description:
                          "Visualize progress and celebrate achievements",
                      },
                    ].map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10"
                      >
                        <div className="size-8 rounded-lg bg-red-800/50 flex items-center justify-center shrink-0">
                          <feature.icon className="size-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                          <p className="text-xs text-white/60">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <ForgotPasswordModal
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
}
