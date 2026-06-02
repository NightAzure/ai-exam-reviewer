"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  MoreVertical,
  UserMinus,
  UserPlus,
  UsersRound,
  Mail,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCourseMembers } from "@/hooks/use-course-members";
import type { CourseMemberRole } from "@/types/course-member";
import { isValidEmail, normalizeEmail } from "@/utils/validation/email";

interface ViewMembersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  courseId: string;
}

export default function ViewMembersDialog({
  isOpen,
  onOpenChange,
  courseName,
  courseId,
}: ViewMembersDialogProps) {
  const { members, isLoading, isMutating, error, addMembers, removeMember, updateMemberRole } =
    useCourseMembers(courseId);
  const [searchQuery, setSearchQuery] = useState("");

  // Single add state
  const [singleEmail, setSingleEmail] = useState("");
  const [singleRole, setSingleRole] = useState<CourseMemberRole>("student");
  const [singleAddError, setSingleAddError] = useState<string | null>(null);

  // Bulk add state
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState<CourseMemberRole>("student");
  const [bulkAddError, setBulkAddError] = useState<string | null>(null);

  // --- Single validation ---
  const normalizedSingleEmail = useMemo(() => normalizeEmail(singleEmail), [singleEmail]);
  const singleEmailError = useMemo(() => {
    if (!singleEmail.trim()) return "";
    if (!isValidEmail(singleEmail)) return "Enter a full email address like student@example.com.";
    return "";
  }, [singleEmail]);

  // --- Bulk validation ---
  const parsedEmails = useMemo(() => {
    const entries = bulkEmails
      .split(/[\n,]/)
      .map((e) => normalizeEmail(e))
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

    return { valid, invalid, duplicates, total: entries.length };
  }, [bulkEmails]);

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRoleBadgeVariant = (role: CourseMemberRole) => {
    switch (role) {
      case "instructor": return "default";
      case "ta": return "secondary";
      default: return "outline";
    }
  };

  const handleAddSingleMember = async () => {
    if (!normalizedSingleEmail || singleEmailError) return;
    setSingleAddError(null);
    try {
      const result = await addMembers([normalizedSingleEmail], singleRole);
      if (result?.warnings && result.warnings.length > 0) {
        setSingleAddError(result.warnings.join("\n"));
        return;
      }
      setSingleEmail("");
      setSingleRole("student");
    } catch (err) {
      setSingleAddError(err instanceof Error ? err.message : "Failed to add member.");
    }
  };

  const handleAddBulkMembers = async () => {
    if (
      parsedEmails.valid.length === 0 ||
      parsedEmails.invalid.length > 0 ||
      parsedEmails.duplicates.length > 0
    ) return;
    setBulkAddError(null);
    try {
      const result = await addMembers(parsedEmails.valid, bulkRole);
      if (result?.warnings && result.warnings.length > 0) {
        setBulkAddError(result.warnings.join("\n"));
        return;
      }
      setBulkEmails("");
      setBulkRole("student");
    } catch (err) {
      setBulkAddError(err instanceof Error ? err.message : "Failed to add members.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Course Members
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="members" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="add-single">Add Member</TabsTrigger>
            <TabsTrigger value="add-bulk">Bulk Add</TabsTrigger>
          </TabsList>

          {/* ── Members list ── */}
          <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">{courseName}</p>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading members..."
                  : `${filteredMembers.length} member${filteredMembers.length !== 1 ? "s" : ""}`}
              </p>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Loading members...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No members found</p>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs capitalize">
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email ?? "No email available"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last active:{" "}
                        {member.lastActiveAt
                          ? new Date(member.lastActiveAt).toLocaleString()
                          : "No activity yet"}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isMutating}>
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Member actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={member.role}
                          onValueChange={(value) =>
                            void updateMemberRole(member.userId, value as CourseMemberRole)
                          }
                        >
                          <DropdownMenuRadioItem value="student">Student</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="ta">Teaching Assistant</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="instructor">Instructor</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => void removeMember(member.userId)}
                          className="text-destructive focus:text-destructive"
                          disabled={member.isPrimaryInstructor}
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          {member.isPrimaryInstructor ? "Primary Instructor" : "Remove Member"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Add single ── */}
          <TabsContent value="add-single" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UserPlus className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Add Single Member</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Invite one existing account by email and assign a role immediately.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.7fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="single-email">Email Address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="single-email"
                    type="email"
                    placeholder="student@example.com"
                    value={singleEmail}
                    onChange={(e) => { setSingleEmail(e.target.value); setSingleAddError(null); }}
                    className="pl-9"
                    aria-invalid={singleEmailError ? "true" : "false"}
                  />
                </div>
                {singleEmailError ? (
                  <p className="text-sm text-destructive">{singleEmailError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The member must already have signed in at least once.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="single-role">Role</Label>
                <Select value={singleRole} onValueChange={(v) => setSingleRole(v as CourseMemberRole)}>
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
            {singleAddError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{singleAddError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => void handleAddSingleMember()}
              className="w-full"
              disabled={isMutating || !normalizedSingleEmail || Boolean(singleEmailError)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isMutating ? "Adding..." : "Add Member"}
            </Button>
          </TabsContent>

          {/* ── Bulk add ── */}
          <TabsContent value="add-bulk" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UsersRound className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Bulk Add Members</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add multiple existing accounts at once. Enter one email per line or separate with commas.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.7fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="bulk-emails">Email Addresses</Label>
                <Textarea
                  id="bulk-emails"
                  placeholder={"student1@example.com\nstudent2@example.com\nstudent3@example.com"}
                  value={bulkEmails}
                  onChange={(e) => { setBulkEmails(e.target.value); setBulkAddError(null); }}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Separate emails with new lines or commas. Invalid or duplicate emails must be fixed before submit.
                </p>

                {bulkEmails.trim() && (
                  <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3">
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
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-role">Role for All Members</Label>
                  <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as CourseMemberRole)}>
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
                  {parsedEmails.duplicates.length > 5 ? ` and ${parsedEmails.duplicates.length - 5} more` : ""}
                </AlertDescription>
              </Alert>
            )}

            {bulkAddError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{bulkAddError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => void handleAddBulkMembers()}
              className="w-full"
              disabled={
                isMutating ||
                parsedEmails.valid.length === 0 ||
                parsedEmails.invalid.length > 0 ||
                parsedEmails.duplicates.length > 0
              }
            >
              <UsersRound className="w-4 h-4 mr-2" />
              {isMutating ? "Adding..." : "Add Members"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
