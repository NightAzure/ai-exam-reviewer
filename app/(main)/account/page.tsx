"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/components/providers/user-provider";
import { clearSWRCache } from "@/lib/swr-cache";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{1,50}$/;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function validateFields(firstName: string, lastName: string, username: string) {
  const errors: { firstName?: string; lastName?: string; username?: string } = {};
  if (firstName.trim() && !NAME_RE.test(firstName.trim())) {
    errors.firstName = "Only letters, spaces, hyphens, and apostrophes (max 50 chars).";
  }
  if (lastName.trim() && !NAME_RE.test(lastName.trim())) {
    errors.lastName = "Only letters, spaces, hyphens, and apostrophes (max 50 chars).";
  }
  if (!username.trim()) {
    errors.username = "Username is required.";
  } else if (!USERNAME_RE.test(username.trim())) {
    errors.username = "Use 3–30 characters: lowercase letters, numbers, and underscores only.";
  }
  return errors;
}

function roleLabel(role: string) {
  if (role === "ta") return "Teaching Assistant";
  if (role === "instructor") return "Instructor";
  if (role === "student") return "Student";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function AccountSettingsSkeleton() {
  return (
    <main className="space-y-8 pb-6" aria-busy="true" aria-label="Loading account settings">
      <header className="border-b border-ink/10 pb-7">
        <div className="h-3 w-20 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
        <div className="mt-3 h-10 w-56 animate-pulse rounded bg-ink/8 motion-reduce:animate-none sm:h-12 sm:w-72" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
        <section className="space-y-5 lg:col-start-1 lg:row-start-1">
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
            <div className="h-8 w-40 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-4 border-b border-ink/10 pb-5">
              <div className="size-14 shrink-0 animate-pulse rounded-2xl bg-ink/8 motion-reduce:animate-none" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
                <div className="h-4 w-28 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="h-11 animate-pulse rounded-xl bg-ink/8 motion-reduce:animate-none" />
              <div className="h-11 animate-pulse rounded-xl bg-ink/8 motion-reduce:animate-none" />
            </div>
            <div className="mt-4 h-11 animate-pulse rounded-xl bg-ink/8 motion-reduce:animate-none" />
            <div className="mt-6 flex justify-end gap-2">
              <div className="h-11 w-24 animate-pulse rounded-xl bg-ink/8 motion-reduce:animate-none" />
              <div className="h-11 w-32 animate-pulse rounded-xl bg-ink/8 motion-reduce:animate-none" />
            </div>
          </div>
        </section>

        <div className="h-64 animate-pulse rounded-2xl bg-ink/90 motion-reduce:animate-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-72" />

        <section className="space-y-5 lg:col-start-1 lg:row-start-2">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
            <div className="h-8 w-28 animate-pulse rounded bg-ink/8 motion-reduce:animate-none" />
          </div>
          <div className="h-24 animate-pulse rounded-2xl border border-ink/10 bg-white motion-reduce:animate-none" />
        </section>
      </div>
    </main>
  );
}

export default function AccountSettings() {
  const { user, isLoading } = useUser();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    username?: string;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name ?? "");
    setLastName(user.second_name ?? "");
    setUsername(user.username ?? "");
  }, [user]);

  const initials = useMemo(() => {
    const a = firstName.trim().charAt(0);
    const b = lastName.trim().charAt(0);
    return `${a}${b}`.trim().toUpperCase() || "U";
  }, [firstName, lastName]);

  const displayName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.trim() || "Your Name",
    [firstName, lastName],
  );

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      firstName !== (user.first_name ?? "") ||
      lastName !== (user.second_name ?? "") ||
      username !== (user.username ?? "")
    );
  }, [user, firstName, lastName, username]);

  const role = user?.role ?? "student";
  const lastUpdated = user?.updated_at ? dateFormatter.format(new Date(user.updated_at)) : null;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const errors = validateFields(firstName, lastName, username);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus(null);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          first_name: firstName,
          second_name: lastName,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message ?? "Unable to update profile");
      await mutate(["user-profile", user.id]);
      setStatus({ type: "success", msg: "Profile settings saved." });
    } catch (err) {
      setStatus({
        type: "error",
        msg: err instanceof Error ? err.message : "Couldn't save changes. Check your connection and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!user) return;
    setFirstName(user.first_name ?? "");
    setLastName(user.second_name ?? "");
    setUsername(user.username ?? "");
    setFieldErrors({});
    setStatus(null);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Continue to clear local state even if the network call fails.
    }
    clearSWRCache();
    router.push("/auth");
  };

  if (isLoading) {
    return <AccountSettingsSkeleton />;
  }

  if (!user) {
    return (
      <main className="pb-6">
        <section
          aria-labelledby="account-signed-out-heading"
          className="rounded-3xl border border-needs-focus/15 bg-white px-6 py-12 text-center shadow-sm"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-needs-focus/8 text-oxblood">
            <AlertCircle aria-hidden="true" className="size-5" />
          </span>
          <h1
            id="account-signed-out-heading"
            className="mt-4 font-[family-name:var(--font-display)] text-2xl text-ink"
          >
            Sign In Required
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate">
            You need an active session to view and update account settings.
          </p>
          <Button
            type="button"
            onClick={() => router.push("/auth")}
            className="mt-5 h-11 rounded-xl bg-ink px-4 text-white hover:bg-ink-raised"
          >
            Go to Sign In
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-6">
      <header className="border-b border-ink/10 pb-7">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
          <UserRound aria-hidden="true" className="size-3.5" />
          Account
        </p>
        <h1 className="mt-2 text-pretty font-[family-name:var(--font-display)] text-4xl leading-none tracking-[-0.035em] text-ink sm:text-5xl">
          Account Settings
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate">
          Update the name shown in your courses and review how you sign in.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
        <section
          aria-labelledby="profile-heading"
          className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
              Profile
            </p>
            <h2
              id="profile-heading"
              className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[-0.025em] text-ink sm:text-3xl"
            >
              Your Details
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate">
              This name and username appear across your review space.
            </p>
          </div>

          <form
            onSubmit={(event) => void handleSave(event)}
            className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6"
            noValidate
          >
            <div className="flex items-center gap-4 border-b border-ink/10 pb-5">
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ink font-[family-name:var(--font-display)] text-xl tracking-tight text-canvas"
              >
                {initials}
              </div>
              <div className="min-w-0 space-y-1.5">
                <p className="truncate font-semibold text-ink">{displayName}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-7 items-center rounded-full border border-ink/12 bg-ink/[0.03] px-2.5 text-xs font-semibold text-slate">
                    {roleLabel(role)}
                  </span>
                  {username.trim() ? (
                    <span className="truncate font-mono text-xs tracking-wide text-slate">
                      @{username.trim()}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-ink">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                    setStatus(null);
                  }}
                  placeholder="e.g. Maria…"
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                  className={cn(
                    "h-11 rounded-xl border-ink/15 bg-white shadow-sm",
                    fieldErrors.firstName && "border-destructive",
                  )}
                />
                {fieldErrors.firstName ? (
                  <p id="firstName-error" role="alert" className="text-xs leading-5 text-destructive">
                    {fieldErrors.firstName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-ink">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                    setStatus(null);
                  }}
                  placeholder="e.g. Santos…"
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                  className={cn(
                    "h-11 rounded-xl border-ink/15 bg-white shadow-sm",
                    fieldErrors.lastName && "border-destructive",
                  )}
                />
                {fieldErrors.lastName ? (
                  <p id="lastName-error" role="alert" className="text-xs leading-5 text-destructive">
                    {fieldErrors.lastName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="username" className="text-ink">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  setStatus(null);
                }}
                placeholder="e.g. maria_santos…"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? "username-error" : "username-help"}
                className={cn(
                  "h-11 rounded-xl border-ink/15 bg-white shadow-sm",
                  fieldErrors.username && "border-destructive",
                )}
              />
              {fieldErrors.username ? (
                <p id="username-error" role="alert" className="text-xs leading-5 text-destructive">
                  {fieldErrors.username}
                </p>
              ) : (
                <p id="username-help" className="text-xs leading-5 text-slate">
                  3–30 characters. Lowercase letters, numbers, and underscores only.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5 min-w-0" aria-live="polite">
                {status ? (
                  <p
                    className={cn(
                      "flex items-start gap-1.5 text-sm leading-5",
                      status.type === "success" ? "text-emerald-700" : "text-destructive",
                    )}
                  >
                    {status.type === "success" ? (
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span>{status.msg}</span>
                  </p>
                ) : lastUpdated ? (
                  <p className="text-xs text-slate">Last updated {lastUpdated}</p>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={!isDirty || isSaving}
                  className="h-11 rounded-xl border-ink/15 bg-white px-4 text-ink shadow-sm hover:bg-ink/[0.03]"
                >
                  Discard Changes
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-ink px-4 text-white hover:bg-ink-raised"
                >
                  {isSaving ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </section>

        <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6">
          <section
            aria-labelledby="security-heading"
            className="overflow-hidden rounded-2xl bg-ink p-5 text-white shadow-[0_18px_40px_rgb(24_36_58/0.16)] sm:p-6"
          >
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brass">
              <Shield aria-hidden="true" className="size-3.5" />
              Security
            </p>
            <h2
              id="security-heading"
              className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight tracking-[-0.025em]"
            >
              Sign-In Details
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Managed by your authentication provider. Password changes happen in Microsoft or your organization.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Email Address
                </p>
                <p className="mt-2 break-all text-sm font-medium text-white">
                  {user.email ?? "No email available"}
                </p>
              </div>

              <div className="rounded-xl border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Authentication Method
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                  <KeyRound aria-hidden="true" className="size-4 shrink-0 text-brass" />
                  Microsoft SSO
                </div>
              </div>
            </div>
          </section>
        </aside>

        <section
          aria-labelledby="account-actions-heading"
          className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-2"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-oxblood">
              Account Actions
            </p>
            <h2
              id="account-actions-heading"
              className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[-0.025em] text-ink sm:text-3xl"
            >
              Session
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate">
              End your current session when you finish studying on this device.
            </p>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white shadow-sm">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <p className="font-semibold text-ink">Sign Out</p>
                <p className="mt-1 text-sm leading-6 text-slate">
                  Ends your session on this device. Your courses and progress stay saved.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="h-11 w-full shrink-0 rounded-xl border-ink/15 bg-white px-4 text-ink shadow-sm hover:bg-ink/[0.03] sm:w-auto"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    Signing Out…
                  </>
                ) : (
                  <>
                    <LogOut aria-hidden="true" className="size-4" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
