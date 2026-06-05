create extension if not exists vector;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  code text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  source_type text not null default 'unknown' check (source_type in ('pdf', 'notes', 'text', 'unknown')),
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_material_chunks (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  material_id uuid not null references public.course_materials(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  chunk_text text not null check (length(trim(chunk_text)) > 0),
  -- 1536 dimensions align with OpenAI-compatible embedding models (for example text-embedding-3-small).
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_material_chunk_unique_order
  on public.course_material_chunks(material_id, chunk_index);
create index if not exists idx_courses_user on public.courses(user_id);
create index if not exists idx_materials_course on public.course_materials(course_id);
create index if not exists idx_chunks_course on public.course_material_chunks(course_id);
create index if not exists idx_chunks_material on public.course_material_chunks(material_id);

create index if not exists idx_chunks_embedding_cosine
  on public.course_material_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.courses enable row level security;
alter table public.course_materials enable row level security;
alter table public.course_material_chunks enable row level security;

drop policy if exists "courses_owner_all" on public.courses;
create policy "courses_owner_all"
on public.courses
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "materials_owner_all" on public.course_materials;
create policy "materials_owner_all"
on public.course_materials
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "chunks_owner_all" on public.course_material_chunks;
create policy "chunks_owner_all"
on public.course_material_chunks
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();
