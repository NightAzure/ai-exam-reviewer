export const ACTIVE_ENROLLMENT_STATUSES = ["active"] as const;

export const isActiveEnrollmentStatus = (value: string | null | undefined) =>
  ACTIVE_ENROLLMENT_STATUSES.includes(value as (typeof ACTIVE_ENROLLMENT_STATUSES)[number]);
