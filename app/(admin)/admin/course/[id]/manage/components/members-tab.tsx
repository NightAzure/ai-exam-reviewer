"use client";

import { useState } from "react";
import { MembersSidebar } from "./members-sidebar";
import { MembersList } from "./members-list";
import { AddSingleMember } from "./add-single-member";
import { AddBulkMembers } from "./add-bulk-members";
import { EnrollmentRequests } from "./enrollment-requests";
import { useCourseMembers } from "@/hooks/use-course-members";
import { useEnrollmentRequests } from "@/hooks/use-enrollment-requests";
import type { CourseMemberRole } from "@/types/course-member";
import { toast } from "sonner";

interface MembersTabProps {
  courseId: number;
}

export function MembersTab({ courseId }: MembersTabProps) {
  const [activeTab, setActiveTab] = useState("list");
  const { members, isLoading, isMutating, error, addMembers, removeMember, updateMemberRole } =
    useCourseMembers(courseId);
  const { count: pendingCount } = useEnrollmentRequests(courseId);

  const memberCounts = {
    total: members.length,
    students: members.filter((member) => member.role === "student").length,
    staff: members.filter((member) => member.role === "instructor" || member.role === "ta").length,
    instructors: members.filter((member) => member.role === "instructor").length,
  };

  const handleAddSingleMember = async (email: string, role: CourseMemberRole) => {
    const result = await addMembers([email], role);

    if (result?.warnings?.length) {
      toast.error("Member could not be added", {
        description: result.warnings.join("\n"),
      });
      return false;
    }

    toast.success(`${email} added as ${role}.`);
    setActiveTab("list");
    return true;
  };

  const handleAddBulkMembers = async (emails: string[], role: CourseMemberRole) => {
    const result = await addMembers(emails, role);

    if (result?.warnings?.length) {
      const addedCount = emails.length - result.warnings.length;
      toast.error(
        addedCount > 0
          ? `Added ${addedCount} member${addedCount === 1 ? "" : "s"}, but some entries need attention`
          : "No members were added",
        { description: result.warnings.join("\n") },
      );
      return false;
    }

    toast.success(`${emails.length} member${emails.length === 1 ? "" : "s"} added as ${role}.`);
    setActiveTab("list");
    return true;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <MembersSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        memberCounts={memberCounts}
        pendingCount={pendingCount}
      />

      <div className="flex-1">
        {activeTab === "list" && (
          <MembersList
            members={members}
            isLoading={isLoading}
            isMutating={isMutating}
            onRemoveMember={removeMember}
            onChangeRole={updateMemberRole}
          />
        )}

        {activeTab === "add-single" && (
          <AddSingleMember onAddMember={handleAddSingleMember} isSubmitting={isMutating} />
        )}

        {activeTab === "add-bulk" && (
          <AddBulkMembers onAddMembers={handleAddBulkMembers} isSubmitting={isMutating} />
        )}

        {activeTab === "requests" && (
          <EnrollmentRequests courseId={courseId} />
        )}
      </div>
    </div>
  );
}
