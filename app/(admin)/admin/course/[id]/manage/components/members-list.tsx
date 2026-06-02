"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, UserMinus, Users, Loader2, Shield, GraduationCap, Sparkles } from "lucide-react";
import type { CourseMember, CourseMemberRole } from "@/types/course-member";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

interface MembersListProps {
  isLoading?: boolean;
  isMutating?: boolean;
  members: CourseMember[];
  onRemoveMember: (userId: string) => Promise<unknown>;
  onChangeRole: (userId: string, role: CourseMemberRole) => Promise<unknown>;
}

export function MembersList({
  members,
  onRemoveMember,
  onChangeRole,
  isLoading = false,
  isMutating = false,
}: MembersListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | CourseMemberRole>("all");
  const [pendingRemoval, setPendingRemoval] = useState<CourseMember | null>(null);

  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const matchesSearch =
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (member.email ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "all" || member.role === roleFilter;
        return matchesSearch && matchesRole;
      }),
    [members, roleFilter, searchQuery],
  );

  const memberSummary = useMemo(
    () => ({
      instructors: members.filter((member) => member.role === "instructor").length,
      tas: members.filter((member) => member.role === "ta").length,
      students: members.filter((member) => member.role === "student").length,
    }),
    [members],
  );

  const getRoleBadgeVariant = (role: CourseMemberRole) => {
    switch (role) {
      case "instructor":
        return "default";
      case "ta":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: CourseMemberRole) => {
    switch (role) {
      case "instructor":
        return "Instructor";
      case "ta":
        return "Teaching Assistant";
      default:
        return "Student";
    }
  };

  const getMembershipSourceLabel = (member: CourseMember) => {
    switch (member.membershipSource) {
      case "course_owner":
        return "Primary Instructor";
      case "course_staff":
        return "Added as Staff";
      default:
        return "Course Enrollment";
    }
  };

  const formatLastActive = (value: string | null) => {
    if (!value) return "No activity yet";
    return new Date(value).toLocaleString();
  };

  const handleRoleChange = async (member: CourseMember, nextRole: CourseMemberRole) => {
    if (member.role === nextRole || isMutating) return;
    await onChangeRole(member.userId, nextRole);
  };

  const confirmRemoveMember = async () => {
    if (!pendingRemoval) return;
    await onRemoveMember(pendingRemoval.userId);
    setPendingRemoval(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Course Members</CardTitle>
          <CardDescription>
            Search, filter, and adjust access without digging through cramped menus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-primary" />
                Staff Coverage
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {memberSummary.instructors + memberSummary.tas}
              </p>
              <p className="text-xs text-muted-foreground">
                {memberSummary.instructors} instructor{memberSummary.instructors === 1 ? "" : "s"} and{" "}
                {memberSummary.tas} TA{memberSummary.tas === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GraduationCap className="h-4 w-4 text-primary" />
                Students
              </div>
              <p className="mt-2 text-2xl font-semibold">{memberSummary.students}</p>
              <p className="text-xs text-muted-foreground">
                Currently enrolled students visible in this workspace
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                Visible Results
              </div>
              <p className="mt-2 text-2xl font-semibold">{filteredMembers.length}</p>
              <p className="text-xs text-muted-foreground">
                Based on the active search and role filter
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | CourseMemberRole)}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="ta">Teaching Assistants</SelectItem>
                <SelectItem value="instructor">Instructors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-lg border py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p className="text-sm">Loading members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-lg border py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p className="text-sm">No members found</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{member.name}</p>
                        {member.isPrimaryInstructor && <Badge className="text-xs">Owner</Badge>}
                        <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs capitalize">
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {member.email ?? "No email available"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border bg-muted/20 px-2.5 py-1">
                          {getMembershipSourceLabel(member)}
                        </span>
                        <span className="rounded-full border bg-muted/20 px-2.5 py-1">
                          Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Unknown"}
                        </span>
                        <span className="rounded-full border bg-muted/20 px-2.5 py-1">
                          Last active {formatLastActive(member.lastActiveAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[280px]">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Access</p>
                        <div className="mt-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) => void handleRoleChange(member, value as CourseMemberRole)}
                            disabled={isMutating || member.isPrimaryInstructor}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="ta">Teaching Assistant</SelectItem>
                              <SelectItem value="instructor">Instructor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive"
                        disabled={isMutating || member.isPrimaryInstructor}
                        onClick={() => setPendingRemoval(member)}
                      >
                        {isMutating && pendingRemoval?.userId === member.userId ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="mr-2 h-4 w-4" />
                        )}
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        onConfirm={confirmRemoveMember}
        title="Remove Member"
        description={
          pendingRemoval
            ? `Remove ${pendingRemoval.name} from this course? Their course membership will be removed immediately.`
            : undefined
        }
        warningItems={[
          "The member will lose course access right away",
          "Existing assessment attempts and history remain for reporting",
          "You can add them back later if needed",
        ]}
        confirmText="Remove Member"
        variant="destructive"
        isLoading={isMutating && Boolean(pendingRemoval)}
      />
    </>
  );
}
