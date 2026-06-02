import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabase as adminSupabase } from "@/utils/supabase/admin";
import { QUESTION_BANK_TABLE } from "@/utils/supabase/question-bank";

type TopicInput = {
  id?: number;
  name: string;
  description?: string | null;
  subtopics?: Array<{
    id?: number;
    name: string;
    description?: string | null;
  }>;
};

const parseCourseId = async (params: Promise<{ courseId: string }>) => {
  const { courseId } = await params;
  const parsed = Number(courseId);
  if (!Number.isFinite(parsed)) throw new Error("Invalid course id");
  return parsed;
};

const requireCourseEditor = async (courseId: number) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
      userId: null as string | null,
    };
  }

  const { data: isEditor, error: editorError } = await supabase.rpc("is_course_editor", {
    _course_id: courseId,
    _user_id: user.id,
  });

  if (editorError || !isEditor) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return { error: null, userId: user.id };
};

const syncTopics = async (courseId: number, topics: TopicInput[]) => {
  const { data: existingTopics, error: existingTopicsError } = await adminSupabase
    .from("topics")
    .select("id, name")
    .eq("course_id", courseId);

  if (existingTopicsError) throw existingTopicsError;

  const existingById = new Map((existingTopics ?? []).map((t) => [t.id, t.name as string]));
  const nextIds = new Set(
    topics.filter((t) => typeof t.id === "number").map((t) => t.id!),
  );

  const topicsToDelete = Array.from(existingById.keys()).filter((id) => !nextIds.has(id));
  if (topicsToDelete.length > 0) {
    const { error } = await adminSupabase.from("topics").delete().in("id", topicsToDelete);
    if (error) throw error;
  }

  for (const [index, topic] of topics.entries()) {
    const newName = topic.name.trim();
    const payload = {
      course_id: courseId,
      name: newName,
      description: topic.description?.trim() || null,
      order_index: index,
    };

    let topicId = typeof topic.id === "number" && existingById.has(topic.id) ? topic.id : null;

    if (topicId != null) {
      const oldName = existingById.get(topicId)!;
      const { error } = await adminSupabase.from("topics").update(payload).eq("id", topicId);
      if (error) throw error;

      // Cascade name change to unlinked question bank rows (topic_id IS NULL)
      if (oldName.toLowerCase() !== newName.toLowerCase()) {
        await adminSupabase
          .from(QUESTION_BANK_TABLE)
          .update({ subject: newName })
          .eq("course_id", courseId)
          .ilike("subject", oldName)
          .is("topic_id", null);
      }
    } else {
      const { data: insertedTopic, error } = await adminSupabase
        .from("topics")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      topicId = insertedTopic.id as number;
    }

    const { data: existingSubtopics, error: existingSubtopicsError } = await adminSupabase
      .from("topic_subtopics")
      .select("id")
      .eq("course_id", courseId)
      .eq("topic_id", topicId);
    if (existingSubtopicsError) throw existingSubtopicsError;

    const subtopics = (topic.subtopics ?? [])
      .map((subtopic) => ({
        id: subtopic.id,
        name: subtopic.name.trim(),
        description: subtopic.description?.trim() || null,
      }))
      .filter((subtopic) => subtopic.name.length > 0);

    const existingSubtopicIds = new Set((existingSubtopics ?? []).map((subtopic) => subtopic.id as number));
    const nextSubtopicIds = new Set(
      subtopics.filter((subtopic) => typeof subtopic.id === "number").map((subtopic) => subtopic.id!),
    );
    const subtopicsToDelete = Array.from(existingSubtopicIds).filter((id) => !nextSubtopicIds.has(id));
    if (subtopicsToDelete.length > 0) {
      const { error } = await adminSupabase
        .from("topic_subtopics")
        .delete()
        .eq("course_id", courseId)
        .eq("topic_id", topicId)
        .in("id", subtopicsToDelete);
      if (error) throw error;
    }

    for (const [subtopicIndex, subtopic] of subtopics.entries()) {
      const subtopicPayload = {
        course_id: courseId,
        topic_id: topicId,
        name: subtopic.name,
        description: subtopic.description,
        order_index: subtopicIndex,
      };

      if (typeof subtopic.id === "number" && existingSubtopicIds.has(subtopic.id)) {
        const { error } = await adminSupabase
          .from("topic_subtopics")
          .update(subtopicPayload)
          .eq("course_id", courseId)
          .eq("topic_id", topicId)
          .eq("id", subtopic.id);
        if (error) throw error;
      } else {
        const { error } = await adminSupabase.from("topic_subtopics").insert(subtopicPayload);
        if (error) throw error;
      }
    }
  }
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const courseId = await parseCourseId(params);
    const auth = await requireCourseEditor(courseId);
    if (auth.error) return auth.error;

    const body = (await request.json()) as { topics: TopicInput[] };

    if (!Array.isArray(body.topics)) {
      return NextResponse.json({ message: "topics must be an array" }, { status: 400 });
    }

    const normalized = body.topics
      .map((t) => ({
        id: t.id,
        name: t.name.trim(),
        description: t.description?.trim() || null,
        subtopics: (t.subtopics ?? [])
          .map((subtopic) => ({
            id: subtopic.id,
            name: subtopic.name.trim(),
            description: subtopic.description?.trim() || null,
          }))
          .filter((subtopic) => subtopic.name.length > 0),
      }))
      .filter((t) => t.name.length > 0);

    await syncTopics(courseId, normalized);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update topics";
    return NextResponse.json({ message }, { status: 500 });
  }
}
