"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X, Clock, Loader2, UserCheck } from "lucide-react";
import { useEnrollmentRequests } from "@/hooks/use-enrollment-requests";
import { toast } from "sonner";

interface EnrollmentRequestsProps {
  courseId: number;
}

export function EnrollmentRequests({ courseId }: EnrollmentRequestsProps) {
  const { requests, isLoading, isMutating, approve, reject } = useEnrollmentRequests(courseId);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const handleApprove = async (studentId: string, name: string) => {
    setActingOn(studentId);
    try {
      await approve(studentId);
      toast.success(`${name} approved.`);
    } catch {
      toast.error("Failed to approve request.");
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (studentId: string, name: string) => {
    setActingOn(studentId);
    try {
      await reject(studentId);
      toast.success(`${name}'s request declined.`);
    } catch {
      toast.error("Failed to decline request.");
    } finally {
      setActingOn(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment Requests</CardTitle>
        <CardDescription>
          Students waiting for approval to join this course.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="rounded-lg border py-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin opacity-40" />
            <p className="text-sm">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border py-12 text-center text-muted-foreground">
            <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No pending requests</p>
            <p className="text-xs mt-1">All caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const isActing = actingOn === req.studentId && isMutating;
              return (
                <div
                  key={req.studentId}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{req.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {req.email ?? "No email"}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Requested{" "}
                        {new Date(req.requestedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={isActing}
                      onClick={() => void handleReject(req.studentId, req.name)}
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Decline</span>
                    </Button>
                    <Button
                      size="sm"
                      disabled={isActing}
                      onClick={() => void handleApprove(req.studentId, req.name)}
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Approve</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
