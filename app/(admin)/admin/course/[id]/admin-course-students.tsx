"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Search,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Course } from "@/types/course";
import { useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { useCourseMembers } from "@/hooks/use-course-members";

interface AdminCourseStudentsProps {
  course: Course;
}

export default function AdminCourseStudents({ course }: AdminCourseStudentsProps) {
  const { members, isLoading, isMutating, error, addMembers } = useCourseMembers(course.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");

  const filteredAndSortedStudents = useMemo(() => {
    const students = members
      .filter((member) => member.role === "student")
      .map((member) => {
        const avgScore = member.averageScore ?? 0;
        const status =
          member.assessmentsTaken === 0
            ? "active"
            : avgScore >= 85
              ? "excellent"
              : avgScore < 60
                ? "at-risk"
                : "active";

        return {
          id: member.userId,
          name: member.name,
          email: member.email ?? "No email available",
          progress: Math.max(0, Math.min(100, avgScore)),
          lastActive: member.lastActiveAt
            ? new Date(member.lastActiveAt).toLocaleString()
            : "No activity yet",
          assessmentsTaken: member.assessmentsTaken,
          avgScore,
          status,
          trend: "stable" as const,
        };
      });

    const filtered = students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || student.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      switch (sortBy) {
        case "name":
          compareA = a.name;
          compareB = b.name;
          break;
        case "progress":
          compareA = a.progress;
          compareB = b.progress;
          break;
        case "avgScore":
          compareA = a.avgScore;
          compareB = b.avgScore;
          break;
        case "assessments":
          compareA = a.assessmentsTaken;
          compareB = b.assessmentsTaken;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return compareA > compareB ? 1 : -1;
      }

      return compareA < compareB ? 1 : -1;
    });

    return filtered;
  }, [members, searchQuery, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / pageSize);
  const paginatedStudents = filteredAndSortedStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleAddStudent = async () => {
    await addMembers([studentEmail], "student");
    setStudentEmail("");
    setAddStudentOpen(false);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }

    setSortBy(field);
    setSortOrder("asc");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return <Badge className="bg-green-100 text-proficient hover:bg-green-100">Excellent</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Active</Badge>;
      case "at-risk":
        return <Badge className="bg-red-100 text-needs-focus hover:bg-red-100">At Risk</Badge>;
      default:
        return <Badge variant="secondary">Active</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-proficient" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-needs-focus" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground/70" />;
    }
  };

  return (
    <>
      <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Student Performance</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isLoading ? "Loading students..." : `${filteredAndSortedStudents.length} students found`}
              </p>
              {error && <p className="text-sm text-needs-focus mt-1">{error}</p>}
            </div>
            <Button className="gap-2 shadow-sm" onClick={() => setAddStudentOpen(true)}>
              <UserPlus className="w-4 h-4" />
              Add Student
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <Input
                placeholder="Search students by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value, 10));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Show 10</SelectItem>
                <SelectItem value="25">Show 25</SelectItem>
                <SelectItem value="50">Show 50</SelectItem>
                <SelectItem value="100">Show 100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => toggleSort("name")}
                    >
                      Student
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[140px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => toggleSort("progress")}
                    >
                      Progress
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => toggleSort("assessments")}
                    >
                      Attempts
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => toggleSort("avgScore")}
                    >
                      Score
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-[140px]">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                            <div className="space-y-1.5 flex-1">
                              <Skeleton className="h-3.5 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-2 w-20 rounded-full" />
                            <Skeleton className="h-3.5 w-8" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-3.5 w-24" /></TableCell>
                      </TableRow>
                    ))
                  : paginatedStudents.map((student) => {
                      const initials = student.name
                        .split(" ")
                        .map((part) => part[0] ?? "")
                        .join("");

                      return (
                        <TableRow key={student.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-white shadow-sm shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-semibold text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{student.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(student.status)}
                              {getTrendIcon(student.trend)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={student.progress} className="h-1.5 w-16" />
                              <span className="text-sm font-medium text-foreground/80 tabular-nums">
                                {student.progress}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium tabular-nums">{student.assessmentsTaken}</span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-bold tabular-nums ${
                                student.avgScore >= 80
                                  ? "text-proficient"
                                  : student.avgScore >= 60
                                    ? "text-yellow-600"
                                    : "text-needs-focus"
                              }`}
                            >
                              {student.avgScore}%
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">{student.lastActive}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                {!isLoading && paginatedStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredAndSortedStudents.length)} of{" "}
                {filteredAndSortedStudents.length} students
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = index + 1;
                    } else if (currentPage <= 3) {
                      pageNum = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + index;
                    } else {
                      pageNum = currentPage - 2 + index;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Student to Course
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student-email">Student Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  id="student-email"
                  type="email"
                  placeholder="student@example.com"
                  className="pl-10"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the email address of the student you want to add to this course.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStudentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddStudent()}
              disabled={!studentEmail || isMutating}
            >
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
