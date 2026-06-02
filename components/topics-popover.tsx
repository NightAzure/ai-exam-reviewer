import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, BarChart2, Target } from "lucide-react";
import { DetailedCourse } from "@/types/course";

// Types (adapt to your DetailedCourse type)
type Topic = {
  id: number;
  name: string;
  progress: number;
};


type Props = {
  course: DetailedCourse;
};

export default function OverviewPopover({ course }: Props) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  return (
    <Popover >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-2xl">
          <BarChart2 className="w-4 h-4" />
          Overview
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4 space-y-4" align="end" >
        <h3 className="font-semibold text-lg">{course.title}</h3>

        {/* Tabs for navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Overall Progress</p>
              <Progress value={course.overallProgress} />
              <p className="text-xs text-muted-foreground mt-1">
                {course.overallProgress}% complete
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Strengths</p>
              <div className="flex flex-wrap gap-2">
                {course.strengths.map((s) => (
                  <Badge key={s} variant="default">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Weaknesses</p>
              <div className="flex flex-wrap gap-2">
                {course.weaknesses.map((w) => (
                  <Badge key={w} variant="destructive">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Topics Tab */}
          <TabsContent value="topics">
            <ScrollArea className="h-48 pr-2">
              <div className="space-y-3">
                {course.topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-2 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedTopic(topic)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{topic.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {topic.progress}%
                      </span>
                    </div>
                    <Progress value={topic.progress} className="mt-1" />
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedTopic && (
              <div className="mt-3 p-3 border rounded-lg bg-muted">
                <p className="text-sm font-medium">
                  Practice: {selectedTopic.name}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="secondary">
                    <BookOpen className="w-4 h-4 mr-1" /> Study
                  </Button>
                  <Button size="sm" variant="default">
                    <Target className="w-4 h-4 mr-1" /> Practice
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {course.suggestions.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
