"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { UsersRound, AlertCircle, CheckCircle2 } from "lucide-react";
import type { CourseMemberRole } from "@/types/course-member";
import { isValidEmail, normalizeEmail } from "@/utils/validation/email";

interface AddBulkMembersProps {
  isSubmitting?: boolean;
  onAddMembers: (emails: string[], role: CourseMemberRole) => Promise<boolean>;
}

export function AddBulkMembers({
  onAddMembers,
  isSubmitting = false,
}: AddBulkMembersProps) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<CourseMemberRole>("student");

  const parsedEmails = useMemo(() => {
    const entries = emails
      .split(/[\n,]/)
      .map((email) => normalizeEmail(email))
      .filter(Boolean);

    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];
    const duplicates: string[] = [];

    entries.forEach((entry) => {
      if (!isValidEmail(entry)) {
        invalid.push(entry);
        return;
      }

      if (seen.has(entry)) {
        duplicates.push(entry);
        return;
      }

      seen.add(entry);
      valid.push(entry);
    });

    return {
      valid,
      invalid,
      duplicates,
      total: entries.length,
    };
  }, [emails]);

  const handleAddMembers = async () => {
    if (
      parsedEmails.valid.length === 0 ||
      parsedEmails.invalid.length > 0 ||
      parsedEmails.duplicates.length > 0
    ) {
      return;
    }

    const shouldReset = await onAddMembers(parsedEmails.valid, role);
    if (!shouldReset) return;

    setEmails("");
    setRole("student");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UsersRound className="w-5 h-5" />
          Bulk Add Members
        </CardTitle>
        <CardDescription>
          Add multiple existing accounts at once. Enter one email per line or separate them with commas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-2">
          <Label htmlFor="bulk-emails">Email Addresses</Label>
          <Textarea
            id="bulk-emails"
            placeholder="student1@example.com&#10;student2@example.com&#10;student3@example.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={10}
          />
          <p className="text-xs text-muted-foreground">
            Separate emails with new lines or commas. Invalid or duplicate emails must be fixed before submit.
          </p>

            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Parsed</p>
                <p className="text-lg font-semibold">{parsedEmails.total}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ready</p>
                <p className="text-lg font-semibold text-emerald-600">{parsedEmails.valid.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs Fix</p>
                <p className="text-lg font-semibold text-destructive">
                  {parsedEmails.invalid.length + parsedEmails.duplicates.length}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-role">Role for All Members</Label>
              <Select value={role} onValueChange={(value) => setRole(value as CourseMemberRole)}>
                <SelectTrigger id="bulk-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="ta">Teaching Assistant</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Bulk add works best for verified internal accounts. Missing accounts will still be rejected by the server.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {parsedEmails.invalid.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid email format: {parsedEmails.invalid.slice(0, 5).join(", ")}
              {parsedEmails.invalid.length > 5 ? ` and ${parsedEmails.invalid.length - 5} more` : ""}
            </AlertDescription>
          </Alert>
        )}

        {parsedEmails.duplicates.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Duplicate email entries: {parsedEmails.duplicates.slice(0, 5).join(", ")}
              {parsedEmails.duplicates.length > 5
                ? ` and ${parsedEmails.duplicates.length - 5} more`
                : ""}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={() => void handleAddMembers()}
          className="w-full"
          disabled={
            isSubmitting ||
            parsedEmails.valid.length === 0 ||
            parsedEmails.invalid.length > 0 ||
            parsedEmails.duplicates.length > 0
          }
        >
          <UsersRound className="w-4 h-4 mr-2" />
          {isSubmitting ? "Adding..." : "Add Members"}
        </Button>
      </CardContent>
    </Card>
  );
}
