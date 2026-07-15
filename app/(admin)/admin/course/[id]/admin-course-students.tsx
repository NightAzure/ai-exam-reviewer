"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  Search,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCourseMembers } from "@/hooks/use-course-members";
import type { Course } from "@/types/course";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("en-PH");
const dateTime = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type StudentStatus = "all" | "not-assessed" | "proficient" | "building" | "needs-focus";

interface AdminCourseStudentsProps {
  course: Course;
}

function statusMeta(assessmentsTaken: number, avgScore: number | null) {
  if (assessmentsTaken === 0 || avgScore == null) {
    return {
      key: "not-assessed" as const,
      label: "Not Assessed",
      badge: "evidence" as const,
      scoreLabel: "Not Assessed",
    };
  }
  if (avgScore >= 75) {
    return {
      key: "proficient" as const,
      label: "Proficient",
      badge: "proficient" as const,
      scoreLabel: `${Math.round(avgScore)}%`,
    };
  }
  if (avgScore >= 60) {
    return {
      key: "building" as const,
      label: "Building Confidence",
      badge: "confidence" as const,
      scoreLabel: `${Math.round(avgScore)}%`,
    };
  }
  return {
    key: "needs-focus" as const,
    label: "Needs Focus",
    badge: "needs-focus" as const,
    scoreLabel: `${Math.round(avgScore)}%`,
  };
}

export default function AdminCourseStudents({ course }: AdminCourseStudentsProps) {
  const { members, isLoading, isMutating, error, addMembers } = useCourseMembers(course.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<StudentStatus>("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const students = useMemo(() => {
    return members
      .filter((member) => member.role === "student")
      .map((member) => {
        const status = statusMeta(member.assessmentsTaken, member.averageScore);
        return {
          id: member.userId,
          name: member.name,
          email: member.email ?? "No email available",
          assessmentsTaken: member.assessmentsTaken,
          avgScore: member.averageScore,
          lastActive: member.lastActiveAt
            ? dateTime.format(new Date(member.lastActiveAt))
            : "No activity yet",
          status,
        };
      });
  }, [members]);

  const filteredAndSortedStudents = useMemo(() => {
    const filtered = students.filter((student) => {
      const query = searchQuery.trim().toLocaleLowerCase();
      const matchesSearch =
        !query ||
        student.name.toLocaleLowerCase().includes(query) ||
        student.email.toLocaleLowerCase().includes(query);
      const matchesStatus =
        filterStatus === "all" || student.status.key === filterStatus;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      switch (sortBy) {
        case "progress":
        case "avgScore":
          compareA = a.avgScore ?? -1;
          compareB = b.avgScore ?? -1;
          break;
        case "assessments":
          compareA = a.assessmentsTaken;
          compareB = b.assessmentsTaken;
          break;
        case "name":
        default:
          compareA = a.name;
          compareB = b.name;
          break;
      }

      if (compareA === compareB) return 0;
      if (sortOrder === "asc") return compareA > compareB ? 1 : -1;
      return compareA < compareB ? 1 : -1;
    });

    return filtered;
  }, [students, searchQuery, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedStudents.length / pageSize));
  const paginatedStudents = filteredAndSortedStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hasActiveFilters =
    filterStatus !== "all" || Boolean(searchQuery.trim());

  const handleAddStudent = async () => {
    setAddError(null);
    try {
      await addMembers([studentEmail], "student");
      setStudentEmail("");
      setAddStudentOpen(false);
    } catch (addFailure) {
      setAddError(
        addFailure instanceof Error ? addFailure.message : "Unable to add student",
      );
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(field);
    setSortOrder("asc");
  };

  const statusFilters: Array<{ value: StudentStatus; label: string }> = [
    { value: "all", label: "All" },
    { value: "needs-focus", label: "Needs Focus" },
    { value: "building", label: "Building" },
    { value: "proficient", label: "Proficient" },
    { value: "not-assessed", label: "Not Assessed" },
  ];

  return (
    <>
      <Card className="rounded-3xl border-ink/10 bg-surface shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-oxblood">
                Roster
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink">Student Performance</h2>
              <p className="mt-1 text-sm text-slate">
                {isLoading
                  ? "Loading students…"
                  : `${number.format(filteredAndSortedStudents.length)} student${filteredAndSortedStudents.length === 1 ? "" : "s"} in this view`}
              </p>
            </div>
            <Button
              type="button"
              className="h-11 gap-2 rounded-xl"
              onClick={() => {
                setAddError(null);
                setAddStudentOpen(true);
              }}
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Add Student
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-3">
            <label className="relative block">
              <span className="sr-only">Search students</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate"
              />
              <Input
                type="search"
                name="student-search"
                placeholder="Search by name or email…"
                autoComplete="off"
                className="h-11 rounded-xl border-ink/15 bg-white pl-10"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
                aria-label="Filter students by assessment status"
              >
                {statusFilters.map((option) => {
                  const isActive = option.value === filterStatus;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setFilterStatus(option.value);
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "h-10 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/50",
                        isActive
                          ? "border-ink bg-ink text-white shadow-sm"
                          : "border-ink/12 bg-white text-slate hover:border-ink/25 hover:text-ink",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value, 10));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-full border-ink/12 bg-white text-xs font-semibold sm:w-[140px]">
                    <Filter aria-hidden="true" className="mr-1 size-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Show 10</SelectItem>
                    <SelectItem value="25">Show 25</SelectItem>
                    <SelectItem value="50">Show 50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-ink/10">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[200px]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1 px-2"
                      onClick={() => toggleSort("name")}
                    >
                      Student
                      <ArrowUpDown aria-hidden="true" className="size-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[110px]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1 px-2"
                      onClick={() => toggleSort("assessments")}
                    >
                      Attempts
                      <ArrowUpDown aria-hidden="true" className="size-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1 px-2"
                      onClick={() => toggleSort("avgScore")}
                    >
                      Score
                      <ArrowUpDown aria-hidden="true" className="size-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-[150px]">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-full" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-3.5 w-28" />
                              <Skeleton className="h-3 w-36" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-8" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      </TableRow>
                    ))
                  : paginatedStudents.map((student) => {
                      const initials = student.name
                        .split(" ")
                        .map((part) => part[0] ?? "")
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <TableRow key={student.id} className="hover:bg-ink/[0.02]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-9 border border-ink/10">
                                <AvatarFallback className="bg-ink text-[11px] font-semibold text-white">
                                  {initials || "ST"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">{student.name}</p>
                                <p className="truncate text-xs text-slate">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={student.status.badge}>{student.status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="tabular-nums font-medium text-ink">
                              {number.format(student.assessmentsTaken)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "tabular-nums font-semibold",
                                student.status.key === "not-assessed"
                                  ? "text-slate"
                                  : "text-ink",
                              )}
                            >
                              {student.status.scoreLabel}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-slate">{student.lastActive}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                {!isLoading && paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <h3 className="text-base font-semibold text-ink">
                        {hasActiveFilters
                          ? "No Students Match That View"
                          : "No Students Enrolled Yet"}
                      </h3>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-slate">
                        {hasActiveFilters
                          ? "Try a different search or clear the status filter."
                          : "Add a student by email, or share the course code from Manage Course."}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 h-10 rounded-xl"
                          onClick={() => {
                            setSearchQuery("");
                            setFilterStatus("all");
                            setCurrentPage(1);
                          }}
                        >
                          Clear Filters
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="mt-4 h-10 rounded-xl"
                          onClick={() => setAddStudentOpen(true)}
                        >
                          Add Student
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedStudents.length > pageSize ? (
            <div className="flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate">
                Showing{" "}
                <span className="tabular-nums font-medium text-ink">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="tabular-nums font-medium text-ink">
                  {Math.min(currentPage * pageSize, filteredAndSortedStudents.length)}
                </span>{" "}
                of{" "}
                <span className="tabular-nums font-medium text-ink">
                  {number.format(filteredAndSortedStudents.length)}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Previous
                </Button>
                <span className="min-w-16 text-center text-sm tabular-nums text-slate">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={addStudentOpen}
        onOpenChange={(open) => {
          setAddStudentOpen(open);
          if (!open) {
            setStudentEmail("");
            setAddError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Student to Course</DialogTitle>
            <DialogDescription>
              Enter the student&apos;s email address. They will be enrolled with student access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="student-email">Student Email</Label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate"
              />
              <Input
                id="student-email"
                type="email"
                name="student-email"
                autoComplete="email"
                placeholder="student@university.edu…"
                className="h-11 rounded-xl pl-10"
                value={studentEmail}
                onChange={(event) => setStudentEmail(event.target.value)}
                disabled={isMutating}
              />
            </div>
            {addError ? (
              <p role="alert" className="text-sm text-destructive">
                {addError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddStudentOpen(false)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAddStudent()}
              disabled={!studentEmail.trim() || isMutating}
            >
              {isMutating ? "Adding…" : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
