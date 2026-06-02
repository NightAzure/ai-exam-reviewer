"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy,
  RefreshCw,
  Check,
  Share2,
  Users,
} from "lucide-react";

interface ShareCourseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  courseId: string;
}

type ShareCoursePayload = {
  code: string;
  usageCount: number;
};

const isShareCoursePayload = (value: unknown): value is ShareCoursePayload => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "code" in value &&
      typeof value.code === "string" &&
      "usageCount" in value &&
      typeof value.usageCount === "number",
  );
};

export default function ShareCourseDialog({
  isOpen,
  onOpenChange,
  courseName,
  courseId,
}: ShareCourseDialogProps) {
  const [courseCode, setCourseCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadShareData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/course/${courseId}/share`, {
          method: "GET",
        });
        const payload = (await response.json().catch(() => null)) as ShareCoursePayload | { message?: string } | null;

        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message)
              : "Unable to load course code",
          );
        }

        if (!isMounted) {
          return;
        }

        if (!isShareCoursePayload(payload)) {
          throw new Error("Unable to load course code");
        }

        setCourseCode(payload.code);
        setUsageCount(payload.usageCount);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load course code");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadShareData();

    return () => {
      isMounted = false;
    };
  }, [courseId, isOpen]);

  const handleCopyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(courseCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleGenerateNewCode = async (): Promise<void> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/course/${courseId}/share`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as ShareCoursePayload | { message?: string } | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Unable to generate a new course code",
        );
      }

      if (!isShareCoursePayload(payload)) {
        throw new Error("Unable to generate a new course code");
      }

      setCourseCode(payload.code);
      setUsageCount(payload.usageCount);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate a new course code",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center">
            <Share2 className="w-4 h-4 mr-2" />
            Share Course
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-1">{courseName}</p>
            <p className="text-xs text-muted-foreground">
              Share this code with students to let them join your course
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-code">Course Code</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="course-code"
                    value={isLoading ? "Loading..." : courseCode}
                    readOnly
                    className="text-center font-mono tracking-wider text-lg font-semibold pr-10"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={handleCopyCode}
                    disabled={isLoading || !courseCode}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <Button
              onClick={handleGenerateNewCode}
              disabled={isGenerating || isLoading}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Code
                </>
              )}
            </Button>
            {error ? (
              <p className="text-xs text-destructive text-center">{error}</p>
            ) : null}
            <div className="bg-muted/50 rounded-lg p-3 text-center pt-2">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-muted-foreground">
                  Students Joined
                </p>
              </div>
              <p className="text-2xl font-bold">{usageCount}</p>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Generating a new code will invalidate the current one
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
