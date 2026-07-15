"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { TopicsManagement } from "./topics-tab";

interface Topic {
  id: number;
  name: string;
  progress: number;
}

interface GeneralTabProps {
  courseId: number;
  name: string;
  code: string;
  description: string;
  thumbnail: string;
  topics: Topic[];
  isSaving?: boolean;
  onSave: () => Promise<void>;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onThumbnailChange: (value: string) => void;
}

export function GeneralTab({
  courseId,
  name,
  code,
  description,
  thumbnail,
  topics,
  isSaving = false,
  onSave,
  onNameChange,
  onCodeChange,
  onDescriptionChange,
  onThumbnailChange,
}: GeneralTabProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/admin/course/${courseId}/share`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate code");
      const data = await res.json() as { code?: string };
      if (data.code) {
        onCodeChange(data.code);
        toast.success("Course code regenerated.");
      }
    } catch {
      toast.error("Failed to regenerate course code.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onThumbnailChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
          <CardDescription>
            Update your course details and information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-name">Course Name</Label>
            <Input
              id="course-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter course name"
            />
          </div>

          <div className="space-y-2">
            <Label>Course Code</Label>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted border">
              <div>
                <p className="font-mono font-semibold tracking-widest text-sm">{code || "—"}</p>
                <p className="text-xs text-slate mt-0.5">Share this code with students</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRegenerate()}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Regenerate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Enter course description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Course Thumbnail</Label>
            <div className="flex gap-4 items-start">
              {thumbnail && (
                <div className="relative w-40 h-24 rounded-lg overflow-hidden border">
                  <Image
                    src={thumbnail}
                    alt="Course thumbnail"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-slate mt-1">
                  Recommended: 16:9 aspect ratio, max 5MB
                </p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course Topics</CardTitle>
          <CardDescription>Manage topics covered in this course</CardDescription>
        </CardHeader>
        <CardContent>
          <TopicsManagement courseId={courseId} initialTopics={topics} />
        </CardContent>
      </Card>

      <Button
        onClick={() => void onSave()}
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}
