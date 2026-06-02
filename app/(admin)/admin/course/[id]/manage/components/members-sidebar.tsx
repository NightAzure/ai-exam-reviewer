"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, UsersRound, Clock } from "lucide-react";

interface MemberCounts {
  total: number;
  students: number;
  staff: number;
  instructors: number;
}

interface MembersSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  memberCounts: MemberCounts;
  pendingCount?: number;
}

export function MembersSidebar({ activeTab, onTabChange, memberCounts, pendingCount = 0 }: MembersSidebarProps) {
  return (
    <Card className="h-fit w-full p-0 lg:w-64">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Member Workspace</p>
          <p className="text-xs text-muted-foreground">
            Review access, add people, and keep teaching roles clean.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 text-xl font-semibold">{memberCounts.total}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Students</p>
            <p className="mt-1 text-xl font-semibold">{memberCounts.students}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Staff</p>
            <p className="mt-1 text-xl font-semibold">{memberCounts.staff}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Instructors</p>
            <p className="mt-1 text-xl font-semibold">{memberCounts.instructors}</p>
          </div>
        </div>

        <div className="space-y-1">
        <Button
          variant={activeTab === "list" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onTabChange("list")}
        >
          <Users className="w-4 h-4 mr-2" />
          Member List
        </Button>
        <Button
          variant={activeTab === "add-single" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onTabChange("add-single")}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
        <Button
          variant={activeTab === "add-bulk" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onTabChange("add-bulk")}
        >
          <UsersRound className="w-4 h-4 mr-2" />
          Bulk Add
        </Button>
        <Button
          variant={activeTab === "requests" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onTabChange("requests")}
        >
          <Clock className="w-4 h-4 mr-2" />
          Requests
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0 h-5">
              {pendingCount}
            </Badge>
          )}
        </Button>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          Instructors and TAs should only be used for real teaching staff. Keep students on student access for reporting and course rules.
        </div>
      </CardContent>
    </Card>
  );
}
