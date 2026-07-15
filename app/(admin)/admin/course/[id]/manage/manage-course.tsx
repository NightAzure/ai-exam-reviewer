"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCourseStore } from "@/stores/course-store";
import { useCourseInit } from "@/hooks/use-course-init";
import { toast } from "sonner";
import { GeneralTab } from "./components/general-tab";
import { DocumentsTab } from "./components/documents-tab";
import { MembersTab } from "./components/members-tab";
import { SettingsTab } from "./components/settings-tab";

const manageTabs = ["general", "documents", "members", "settings"] as const;
type ManageTab = (typeof manageTabs)[number];

function parseManageTab(value: string | null): ManageTab {
  return manageTabs.includes(value as ManageTab) ? (value as ManageTab) : "general";
}

interface ManageCoursePageProps {
  id: string;
}

export default function ManageCoursePage({ id }: ManageCoursePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = parseInt(id);
  const [activeTab, setActiveTab] = useState<ManageTab>(() =>
    parseManageTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setActiveTab(parseManageTab(searchParams.get("tab")));
  }, [searchParams]);

  useCourseInit(courseId);

  const course = useCourseStore((state) => state.getCourse(courseId));

  const [name, setName] = useState(course?.title || "");
  const [code, setCode] = useState(course?.code || "");
  const [description, setDescription] = useState(course?.description || "");
  const [thumbnail, setThumbnail] = useState(course?.thumbnail || "");
  const [allowSelfEnrollment, setAllowSelfEnrollment] = useState(true);
  const [requireEnrollmentApproval, setRequireEnrollmentApproval] = useState(false);
  const [disabled, setDisabled] = useState(!course?.isActive);
  const [isGeneralSaving, setIsGeneralSaving] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!course) return;
    setName(course.title);
    setCode(course.code);
    setDescription(course.description);
    setThumbnail(course.thumbnail || "");
    setAllowSelfEnrollment(course.allowSelfEnrollment ?? true);
    setRequireEnrollmentApproval(course.requireEnrollmentApproval ?? false);
    setDisabled(!course.isActive);
  }, [course]);

  const saveCourse = async (mode: "general" | "settings") => {
    const setSaving = mode === "general" ? setIsGeneralSaving : setIsSettingsSaving;
    setSaving(true);

    try {
      const body =
        mode === "general"
          ? { title: name, code, description, thumbnail }
          : { isActive: !disabled, allowSelfEnrollment, requireEnrollmentApproval };

      const response = await fetch(`/api/admin/course/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Unable to save course",
        );
      }

      toast.success(mode === "general" ? "Course details saved." : "Course settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save course");
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/course/${courseId}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Unable to delete course",
        );
      }

      router.replace("/admin/courses");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete course");
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  if (!course) {
    return <div>Loading course...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/courses")}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Manage Course</h1>
          <p className="text-sm text-slate">{name}</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = parseManageTab(value);
          setActiveTab(nextTab);
          const params = new URLSearchParams(searchParams.toString());
          if (nextTab === "general") params.delete("tab");
          else params.set("tab", nextTab);
          const query = params.toString();
          router.replace(
            `/admin/course/${courseId}/manage${query ? `?${query}` : ""}`,
            { scroll: false },
          );
        }}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 rounded-xl bg-muted p-1 h-auto">
          <TabsTrigger value="general" className="rounded-lg py-2.5 text-sm font-medium text-slate transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">General</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg py-2.5 text-sm font-medium text-slate transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <span className="sm:hidden">Documents</span>
            <span className="hidden sm:inline">RAG Documents</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg py-2.5 text-sm font-medium text-slate transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">Members</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg py-2.5 text-sm font-medium text-slate transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab
            courseId={courseId}
            name={name}
            code={code}
            description={description}
            thumbnail={thumbnail}
            topics={course.topics || []}
            isSaving={isGeneralSaving}
            onSave={() => saveCourse("general")}
            onNameChange={setName}
            onCodeChange={setCode}
            onDescriptionChange={setDescription}
            onThumbnailChange={setThumbnail}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab
            courseTitle={name}
            courseCode={code}
            allowSelfEnrollment={allowSelfEnrollment}
            requireEnrollmentApproval={requireEnrollmentApproval}
            disabled={disabled}
            isSaving={isSettingsSaving}
            isDeleting={isDeleting}
            onSave={() => saveCourse("settings")}
            onDelete={deleteCourse}
            onSelfEnrollmentChange={setAllowSelfEnrollment}
            onRequireApprovalChange={setRequireEnrollmentApproval}
            onDisabledChange={setDisabled}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
