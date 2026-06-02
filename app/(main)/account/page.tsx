"use client";

import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/providers/user-provider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]{1,50}$/;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

function validateFields(firstName: string, lastName: string, username: string) {
  const errors: { firstName?: string; lastName?: string; username?: string } = {};
  if (firstName.trim() && !NAME_RE.test(firstName.trim()))
    errors.firstName = "Only letters, spaces, hyphens, and apostrophes (max 50 chars).";
  if (lastName.trim() && !NAME_RE.test(lastName.trim()))
    errors.lastName = "Only letters, spaces, hyphens, and apostrophes (max 50 chars).";
  if (!username.trim()) errors.username = "Username is required.";
  else if (!USERNAME_RE.test(username.trim()))
    errors.username = "3–30 chars: lowercase letters, numbers, underscores only.";
  return errors;
}

const ROLE_META: Record<string, { label: string; variant: "default" | "secondary" | "outline"; className: string }> = {
  instructor: { label: "Instructor", variant: "default", className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  ta:         { label: "Teaching Assistant", variant: "default", className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100" },
  student:    { label: "Student", variant: "secondary", className: "" },
};

export default function AccountSettings() {
  const { user, isLoading } = useUser();
  const { mutate } = useSWRConfig();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; lastName?: string; username?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name ?? "");
    setLastName(user.second_name ?? "");
    setUsername(user.username ?? "");
  }, [user]);

  const initials = useMemo(() => {
    const a = (user?.first_name ?? "").trim().charAt(0);
    const b = (user?.second_name ?? "").trim().charAt(0);
    return `${a}${b}`.trim() || "U";
  }, [user]);

  const displayName = useMemo(
    () => `${(user?.first_name ?? "").trim()} ${(user?.second_name ?? "").trim()}`.trim() || "Your Name",
    [user],
  );

  const role = user?.role ?? "student";
  const roleMeta = ROLE_META[role] ?? { label: role.charAt(0).toUpperCase() + role.slice(1), variant: "secondary" as const, className: "" };

  const handleSave = async () => {
    if (!user) return;
    const errors = validateFields(firstName, lastName, username);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setIsSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, first_name: firstName, second_name: lastName }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message ?? "Unable to update profile");
      await mutate(["user-profile", user.id]);
      setStatus({ type: "success", msg: "Profile updated." });
    } catch (err) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Unable to update profile" });
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-4 pb-5 border-b">
                <Skeleton className="size-16 rounded-full" />
                <div className="space-y-1.5"><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-20" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-9 rounded-lg" /><Skeleton className="h-9 rounded-lg" />
              </div>
              <Skeleton className="h-9 rounded-lg" />
            </CardContent>
          </Card>
          <Card><CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-sm text-destructive">You need to sign in to view account settings.</p>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and sign-in details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── Left: Profile form ── */}
        <Card>
          <CardContent className="p-6 space-y-5">

            {/* Live preview */}
            <div className="flex items-center gap-4 pb-5 border-b">
              <div className="size-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 select-none">
                <motion.span
                  key={initials}
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {initials}
                </motion.span>
              </div>
              <div className="min-w-0 space-y-1">
                <motion.p
                  key={displayName}
                  className="font-semibold text-foreground truncate"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {displayName}
                </motion.p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={roleMeta.variant} className={cn("text-xs font-medium", roleMeta.className)}>
                    {roleMeta.label}
                  </Badge>
                  {user.username && (
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setFieldErrors(p => ({ ...p, firstName: undefined })); }}
                  className={cn(fieldErrors.firstName && "border-destructive")}
                />
                {fieldErrors.firstName && <p className="text-xs text-destructive">{fieldErrors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setFieldErrors(p => ({ ...p, lastName: undefined })); }}
                  className={cn(fieldErrors.lastName && "border-destructive")}
                />
                {fieldErrors.lastName && <p className="text-xs text-destructive">{fieldErrors.lastName}</p>}
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: undefined })); }}
                className={cn(fieldErrors.username && "border-destructive")}
              />
              {fieldErrors.username
                ? <p className="text-xs text-destructive">{fieldErrors.username}</p>
                : <p className="text-xs text-muted-foreground">3–30 characters. Lowercase letters, numbers, and underscores only.</p>}
            </div>

            {/* Actions + status */}
            <div className="flex items-center justify-between pt-1 border-t gap-4">
              <AnimatePresence mode="wait">
                {status && (
                  <motion.p
                    key={status.type}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "flex items-center gap-1.5 text-sm",
                      status.type === "success" ? "text-emerald-600" : "text-destructive"
                    )}
                  >
                    {status.type === "success"
                      ? <CheckCircle2 className="size-4 shrink-0" />
                      : <AlertCircle className="size-4 shrink-0" />}
                    {status.msg}
                  </motion.p>
                )}
                {!status && <div />}
              </AnimatePresence>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
                <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Right: Sign-in info ── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold">Sign-In Details</p>
              <p className="text-xs text-muted-foreground mt-0.5">Managed by your authentication provider.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email Address</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground select-none truncate">
                  {user.email ?? "No email available"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Authentication Method</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground select-none">
                  Microsoft SSO
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Password changes are handled through your Microsoft account or organization&apos;s identity provider.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
