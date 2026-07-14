import type { Topic } from "@/types/course";

export type TopicMasteryStatus =
  | "not_assessed"
  | "needs_focus"
  | "building_confidence"
  | "proficient"
  | "mastered";

type TopicMastery = {
  status: TopicMasteryStatus;
  label: string;
  detail: string;
  badgeClassName: string;
  progressClassName: string;
};

export function getTopicMastery(
  progress: number,
  evidenceCount = 0,
): TopicMastery {
  if (evidenceCount <= 0) {
    return {
      status: "not_assessed",
      label: "Not Assessed",
      detail: "Build your baseline",
      badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
      progressClassName: "bg-sky-500",
    };
  }

  if (progress < 60) {
    return {
      status: "needs_focus",
      label: "Needs Focus",
      detail: "Focus here next",
      badgeClassName: "border-[#a0363d]/20 bg-[#8e3039]/8 text-[#8e3039]",
      progressClassName: "bg-[#8e3039]",
    };
  }

  if (progress < 75) {
    return {
      status: "building_confidence",
      label: "Building Confidence",
      detail: "Keep building confidence",
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
      progressClassName: "bg-amber-500",
    };
  }

  if (progress < 90) {
    return {
      status: "proficient",
      label: "Proficient",
      detail: "Strong foundation",
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      progressClassName: "bg-emerald-600",
    };
  }

  return {
    status: "mastered",
    label: "Mastered",
    detail: "Consistently strong",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    progressClassName: "bg-emerald-600",
  };
}

export function getTopicMasteryForTopic(topic: Topic): TopicMastery {
  return getTopicMastery(topic.progress, topic.evidenceCount ?? 0);
}
