-- 실습일지 초안 저장 테이블
-- 입력: practice_note + soap_note + optional extra_note
-- 출력: 학습용 실습일지 5개 섹션

create table if not exists public.journal_drafts (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  note_id                 uuid references public.practice_notes(id) on delete set null,
  soap_note_id            uuid not null references public.soap_notes(id) on delete cascade,
  source_text             text not null,
  input_hash              text,
  practice_text           text not null,
  soap_snapshot           text not null,
  extra_note              text,
  summary                 text not null,
  observation_performance text not null,
  learning_points         text not null,
  improvements            text not null,
  next_goals              text not null,
  created_at              timestamptz not null default now()
);

create index if not exists journal_drafts_user_id_idx
  on public.journal_drafts(user_id);

create index if not exists journal_drafts_note_id_idx
  on public.journal_drafts(note_id);

create index if not exists journal_drafts_soap_note_id_idx
  on public.journal_drafts(soap_note_id);

create index if not exists journal_drafts_created_at_idx
  on public.journal_drafts(created_at desc);

create index if not exists journal_drafts_input_hash_idx
  on public.journal_drafts(user_id, input_hash)
  where input_hash is not null;

alter table public.journal_drafts enable row level security;

create policy "journal_drafts_self"
  on public.journal_drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
