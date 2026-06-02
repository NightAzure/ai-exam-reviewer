import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dispatch, SetStateAction, useState } from "react";
import { FilterOptions } from "./admin-courses-view";
import { Search, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

type AdminCoursesHeaderProps = {
    filters: FilterOptions;
    setFilters: Dispatch<SetStateAction<FilterOptions>>;
    stats: {
      total: number;
      active: number;
      disabled: number;
    };
}

export default function AdminCoursesHeader({ filters, setFilters, stats }: AdminCoursesHeaderProps){
    void stats;
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [courseTitle, setCourseTitle] = useState("");
    const [courseCode, setCourseCode] = useState("");
    const [courseDescription, setCourseDescription] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleFilterChange = (key: keyof FilterOptions, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetCreateForm = () => {
      setCourseTitle("");
      setCourseCode("");
      setCourseDescription("");
      setCreateError(null);
      setIsCreating(false);
    };

    const handleCreateOpenChange = (open: boolean) => {
      setIsCreateOpen(open);
      if (!open) {
        resetCreateForm();
      }
    };

    const handleCreateCourse = async () => {
      setIsCreating(true);
      setCreateError(null);

      try {
        const response = await fetch("/api/admin/course", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: courseTitle,
            code: courseCode,
            description: courseDescription,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message)
              : "Unable to create course",
          );
        }

        await mutate("courses");
        setIsCreateOpen(false);
        resetCreateForm();

        const nextCourseId =
          payload &&
          typeof payload === "object" &&
          "course" in payload &&
          payload.course &&
          typeof payload.course === "object" &&
          "id" in payload.course
            ? Number(payload.course.id)
            : NaN;

        if (Number.isFinite(nextCourseId)) {
          router.push(`/admin/course/${nextCourseId}/manage`);
          return;
        }

        router.refresh();
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "Unable to create course");
      } finally {
        setIsCreating(false);
      }
    };

    return(
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Course Management</h1>
              <p className="text-muted-foreground">
                Manage and monitor all courses across the platform
              </p>
            </div>

            {/* Act buttons */}
            <div className="flex items-center gap-3">
              {/*<Button variant="outline" size="sm" className="gap-2">
                <BarChart className="h-4 w-4" />
                Analytics
              </Button>*/}
              <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Course
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by course name, code, or instructor..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.enabledStatus}
              onValueChange={(value) => handleFilterChange("enabledStatus", value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="enabled">Enabled Only</SelectItem>
                <SelectItem value="disabled">Disabled Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sortBy}
              onValueChange={(value) => handleFilterChange("sortBy", value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="code">Course Code</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filters.status !== "all" || filters.instructor !== "all" || filters.searchQuery || filters.enabledStatus !== "all") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.searchQuery}
                  <button
                    onClick={() => handleFilterChange("searchQuery", "")}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.status !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status}
                  <button
                    onClick={() => handleFilterChange("status", "all")}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.instructor !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Instructor: {filters.instructor}
                  <button
                    onClick={() => handleFilterChange("instructor", "all")}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.enabledStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Availability: {filters.enabledStatus}
                  <button
                    onClick={() => handleFilterChange("enabledStatus", "all")}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ status: "all", instructor: "all", searchQuery: "", sortBy: "name", enabledStatus: "all" })}
                className="h-6 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
          <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Course</DialogTitle>
                <DialogDescription>
                  Set up the core course details now. You can finish topics, members, and documents on the manage screen.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course-title">Course Title</Label>
                  <Input
                    id="course-title"
                    value={courseTitle}
                    onChange={(event) => setCourseTitle(event.target.value)}
                    placeholder="Engineering Mathematics"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-code">Course Code</Label>
                  <Input
                    id="course-code"
                    value={courseCode}
                    onChange={(event) => setCourseCode(event.target.value.toUpperCase())}
                    placeholder="Leave blank to auto-generate"
                    disabled={isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a memorable code, or leave this blank and a unique code will be generated automatically.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course-description">Description</Label>
                  <Textarea
                    id="course-description"
                    value={courseDescription}
                    onChange={(event) => setCourseDescription(event.target.value)}
                    placeholder="Describe the scope, audience, or learning goals."
                    disabled={isCreating}
                  />
                </div>

                {createError && (
                  <p className="text-sm text-destructive">{createError}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleCreateOpenChange(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleCreateCourse()}
                  disabled={isCreating || !courseTitle.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create and Continue"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
    )
}
