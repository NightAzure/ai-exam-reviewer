"use client"
import { CornerDownLeft, Brain } from "lucide-react";
import {useRouter} from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Course } from "@/types/course";

interface CourseHeaderProps{
    course: Course;
}

export default function CourseHeader({course}: CourseHeaderProps){
    const router = useRouter();
    return (<div className="flex flex-col sm:flex-row items-start gap-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:text-muted-foreground size-10 flex items-center justify-center hover:bg-muted rounded-lg transition-colors"
        >
          <CornerDownLeft />
        </button>

        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" /> {course.title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            {course.description}
          </p>
        </div>

        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium mb-1">Overall Progress</p>
          <Progress
            value={course.stats?.averageProgress || 0}
            className="h-2 w-36 rounded-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {course.stats?.averageProgress || 0}%
          </p>
        </div>
      </div>
      )
}