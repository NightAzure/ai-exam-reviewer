"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, ShieldCheck } from "lucide-react";
import type { CourseMemberRole } from "@/types/course-member";
import { isValidEmail, normalizeEmail } from "@/utils/validation/email";

interface AddSingleMemberProps {
  isSubmitting?: boolean;
  onAddMember: (email: string, role: CourseMemberRole) => Promise<boolean>;
}

export function AddSingleMember({
  onAddMember,
  isSubmitting = false,
}: AddSingleMemberProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CourseMemberRole>("student");

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const emailError = useMemo(() => {
    if (!email.trim()) return "";
    if (!isValidEmail(email)) {
      return "Enter a full email address like student@example.com.";
    }
    return "";
  }, [email]);

  const handleAddMember = async () => {
    if (!normalizedEmail || emailError) return;

    const shouldReset = await onAddMember(normalizedEmail, role);
    if (!shouldReset) return;

    setEmail("");
    setRole("student");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="w-5 h-5" />
          Add Single Member
        </CardTitle>
        <CardDescription>
          Invite one existing account by email and assign a role immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-2">
          <Label htmlFor="single-email">Email Address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="single-email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-9"
                aria-invalid={emailError ? "true" : "false"}
              />
            </div>
            {emailError ? (
              <p className="text-sm text-destructive">{emailError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                The member must already have signed in at least once.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="single-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as CourseMemberRole)}>
              <SelectTrigger id="single-role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="ta">Teaching Assistant</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            Use instructor or TA only for real teaching staff. Students should stay on the student role so analytics and membership rules remain correct.
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => void handleAddMember()}
          className="w-full"
          disabled={isSubmitting || !normalizedEmail || Boolean(emailError)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {isSubmitting ? "Adding..." : "Add Member"}
        </Button>
      </CardContent>
    </Card>
  );
}
