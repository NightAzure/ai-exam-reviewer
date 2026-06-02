-- Phase 1B: documents/RAG file metadata for course management.
-- Files themselves can live in Supabase Storage; this table tracks app metadata.

do $$
begin
  create type public.document_processing_status as enum (
    'uploaded',
    'processing',
    'ready',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.course_documents (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint,
  storage_bucket text not null default 'course-documents',
  storage_path text not null,
  processing_status public.document_processing_status not null default 'uploaded',
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_course_documents_course_id on public.course_documents(course_id);
create index if not exists idx_course_documents_uploaded_by on public.course_documents(uploaded_by);
create index if not exists idx_course_documents_processing_status on public.course_documents(processing_status);
