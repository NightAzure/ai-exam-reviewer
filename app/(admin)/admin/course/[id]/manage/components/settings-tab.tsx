"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Save, Loader2, Ban, CheckCircle } from "lucide-react";

interface SettingsTabProps {
  courseTitle: string;
  courseCode: string;
  allowSelfEnrollment: boolean;
  requireEnrollmentApproval: boolean;
  disabled: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSelfEnrollmentChange: (value: boolean) => void;
  onRequireApprovalChange: (value: boolean) => void;
  onDisabledChange: (value: boolean) => void;
}

export function SettingsTab({
  courseTitle,
  courseCode,
  allowSelfEnrollment,
  requireEnrollmentApproval,
  disabled,
  isSaving = false,
  isDeleting = false,
  onSave,
  onDelete,
  onSelfEnrollmentChange,
  onRequireApprovalChange,
  onDisabledChange,
}: SettingsTabProps) {
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isTogglingDisabled, setIsTogglingDisabled] = useState(false);

  const handleToggleDisabled = () => {
    if (!disabled) {
      setShowDisableDialog(true);
      return;
    }

    void confirmToggleDisabled();
  };

  const confirmToggleDisabled = async () => {
    setIsTogglingDisabled(true);
    onDisabledChange(!disabled);

    try {
      await onSave();
      setShowDisableDialog(false);
    } finally {
      setIsTogglingDisabled(false);
    }
  };

  const handleDeleteCourse = async () => {
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } catch {
      return;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Settings</CardTitle>
          <CardDescription>
            Configure course availability and enrollment options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="space-y-0.5">
              <Label htmlFor="enrollment-toggle" className="cursor-pointer">
                Self-Enrollment
              </Label>
              <p className="text-xs text-slate">
                Allow students to join using the course code
              </p>
            </div>
            <Switch
              id="enrollment-toggle"
              checked={allowSelfEnrollment}
              onCheckedChange={onSelfEnrollmentChange}
            />
          </div>

          {allowSelfEnrollment && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="approval-toggle" className="cursor-pointer">
                  Require Enrollment Approval
                </Label>
                <p className="text-xs text-slate">
                  Students must be approved before they can access the course
                </p>
              </div>
              <Switch
                id="approval-toggle"
                checked={requireEnrollmentApproval}
                onCheckedChange={onRequireApprovalChange}
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-destructive/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-destructive/70">
                {disabled ? "Course Status" : "Danger Zone"}
              </span>
            </div>
          </div>

          <div
            className={`flex items-start justify-between p-6 rounded-lg border-2 ${
              disabled
                ? "border-green-500/50 bg-green-500/10"
                : "border-destructive/50 bg-destructive/10"
            }`}
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {disabled ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Ban className="w-5 h-5 text-destructive" />
                )}
                <h3 className="font-semibold text-base">
                  {disabled ? "Enable This Course" : "Disable This Course"}
                </h3>
              </div>
              <p className="text-sm text-slate">
                {disabled
                  ? "Re-enable this course to allow students to access materials, submit assignments, and participate in course activities."
                  : "Disabling this course will prevent all students from accessing course materials, submitting assignments, and participating in any course activities. This action can be reversed."}
              </p>
            </div>
            <Button
              variant={disabled ? "default" : "destructive"}
              size="default"
              onClick={handleToggleDisabled}
              disabled={isTogglingDisabled || isSaving}
              className="ml-4 shrink-0"
            >
              {isTogglingDisabled ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {disabled ? "Enabling..." : "Disabling..."}
                </>
              ) : disabled ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enable Course
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Disable Course
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Delete Course</CardTitle>
          <CardDescription>
            Permanently remove <span className="font-medium text-foreground">{courseTitle}</span>. This
            action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 text-sm text-slate">
            <p>
              Deleting a course removes the course record and its connected learning data, including
              assessments, attempts, notes, chat history, documents, and memberships.
            </p>
            <p>
              For safety, only the course creator or primary instructor can perform this action.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isSaving || isDeleting}
            className="shrink-0"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Course"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button
          onClick={() => void onSave()}
          disabled={isSaving}
          variant="default"
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
              Save Settings
            </>
          )}
        </Button>
      </div>

      <ConfirmationDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
        onConfirm={confirmToggleDisabled}
        title="Disable Course"
        description="Are you sure you want to disable this course?"
        warningItems={[
          "Students will not be able to access course materials",
          "All assignments and submissions will be locked",
          "Course discussions and activities will be disabled",
        ]}
        confirmText="Disable Course"
        variant="destructive"
        isLoading={isTogglingDisabled}
      />

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteCourse}
        title="Delete Course Permanently"
        description="This will permanently remove the course and all related course data."
        warningItems={[
          "All assessments, attempt history, and question-bank entries for this course",
          "All uploaded course documents and their stored files",
          "All enrollments, staff assignments, chat threads, notes, and analytics history",
        ]}
        confirmationLabel={`Type the course code "${courseCode}" to confirm deletion`}
        confirmationValue={courseCode}
        confirmationPlaceholder={courseCode}
        confirmText="Delete Permanently"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
