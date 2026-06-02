import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Course } from "@/types/new_course";
import {
  Star,
  BookOpen,
  BarChart3,
  EllipsisVertical,
  Share2,
  Users,
  Settings,
  Ban,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ShareCourseDialog from "./share-course-dialog";
import ViewMembersDialog from "./view-members-dialog";
import { useFavorites } from "@/hooks/use-favorites";

const FALLBACK_COURSE_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23f3f4f6'/%3E%3Cpath d='M0 300c120-40 200-60 320-40s180 50 280 36 120-48 200-72v176H0Z' fill='%23dbeafe'/%3E%3C/svg%3E";

type CourseCardCourse = Course & {
  stats?: {
    averageProgress?: number;
    proficient?: number;
    needsReview?: number;
  };
};

interface CourseCardProps {
  variant?: "main" | "admin";
  course: CourseCardCourse;
}

export default function CourseCard({
  variant = "main",
  course,
}: CourseCardProps) {
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [viewMembersOpen, setViewMembersOpen] = useState(false);

  const router = useRouter();

  // Handle potential undefined values
  if (!course || !course.id) {
    return null;
  }

  const isDisabled = !course.is_active;

  return (
    <Card
      className={`hover:shadow-md h-full gap-4 transition-all pt-0 pb-5 cursor-pointer border-primary/20 hover:border-primary/30 overflow-hidden ${
        isDisabled ? "opacity-90" : ""
      }`}
    >
      <div className="relative w-full h-32">
        <Image
          src={course.thumbnail_url || FALLBACK_COURSE_THUMBNAIL}
          alt={course.title}
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background/70 via-background/20 to-transparent" />

        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          {variant === "admin" && (
            <span className="flex items-center gap-1.5 bg-background/80 text-foreground text-xs font-semibold px-2 py-1 rounded-md shadow-sm backdrop-blur-sm">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {course.code}
            </span>
          )}
          {isDisabled && (
            <span className="flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground text-xs font-semibold px-2 py-1 rounded-md shadow-sm backdrop-blur-sm">
              <Ban className="h-3.5 w-3.5" />
              Disabled
            </span>
          )}
        </div>
      </div>

      <CardHeader className="pb-2 px-4 gap-0">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-md font-medium text-foreground">{course.title}</p>
            <p className="text-xs text-muted-foreground">
              Instructor: {course.instructor?.first_name} {course.instructor?.second_name|| 'Unknown'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="size-8"
              onClick={() => toggleFavorite(course.id)}
            >
              <motion.div
                key={isFavorited(course.id).toString()}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <Star
                  className={`${
                    isFavorited(course.id)
                      ? "text-yellow-500 fill-current"
                      : "text-foreground"
                  }`}
                />
              </motion.div>
            </Button>
            {variant == "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <EllipsisVertical className="h-4 w-4" />
                    <span className="sr-only">Open course menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Course Code
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMembersOpen(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    View Members
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/admin/course/${course.id}/manage`)
                    }
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Course
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4">
        <HoverCard>
          <HoverCardTrigger asChild>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Overall Progress
              </p>
              <Progress value={course.stats?.averageProgress || 0} />
              <p className="text-xs text-muted-foreground mt-1">
                {course.stats?.averageProgress || 0}% complete
              </p>
            </div>
          </HoverCardTrigger>
          <HoverCardContent>
            {/*TODO*/}
            <div className="flex justify-between text-xs font-medium flex-col">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-green-600" />
                <span>{course.stats?.proficient || 0} Proficient</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-red-600" />
                <span>{course.stats?.needsReview || 0} Needs Review</span>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        {variant != "admin" && (
          <Button
            onClick={() => router.push("/course/" + course.id)}
            size="sm"
            className="w-full"
            disabled={isDisabled}
          >
            {isDisabled ? "Course Disabled" : "Go to Course"}
          </Button>
        )}

        {variant == "admin" && (
          <Button
            onClick={() => router.push("/admin/course/" + course.id)}
            size="sm"
            className="w-full"
          >
            Go to Course
          </Button>
        )}
      </CardContent>
      <ShareCourseDialog
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        courseName={course.title}
        courseId={course.id.toString()}
      />
      <ViewMembersDialog
        isOpen={viewMembersOpen}
        onOpenChange={setViewMembersOpen}
        courseName={course.title}
        courseId={course.id.toString()}
      />
    </Card>
  );
}
