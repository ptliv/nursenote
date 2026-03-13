-- 케이스스터디 초안 저장 테이블
-- 입력: practice_note + soap_note + journal_draft + optional extra_note
-- 출력: 케이스스터디 학습용 5개 섹션 초안

create table if not exists public.case_study_drafts (
  id                         uuid primary key default uuid_generate_v4(),
  user_id                    uuid not null references public.profiles(id) on delete cascade,
  note_id                    uuid references public.practice_notes(id) on delete set null,
  soap_note_id               uuid not null references public.soap_notes(id) on delete cascade,
  journal_draft_id           uuid not null references public.journal_drafts(id) on delete cascade,
  source_text                text not null,
  input_hash                 text,
  practice_text              text not null,
  soap_snapshot              text not null,
  journal_snapshot           text not null,
  extra_note                 text,
  patient_summary            text not null,
  major_observations         text not null,
  nursing_problem_candidates text not null,
  priority_summary           text not null,
  learning_needs             text not null,
  created_at                 timestamptz not null default now()
);

create index if not exists case_study_drafts_user_id_idx
  on public.case_study_drafts(user_id);

create index if not exists case_study_drafts_note_id_idx
  on public.case_study_drafts(note_id);

create index if not exists case_study_drafts_soap_note_id_idx
  on public.case_study_drafts(soap_note_id);

create index if not exists case_study_drafts_journal_draft_id_idx
  on public.case_study_drafts(journal_draft_id);

create index if not exists case_study_drafts_created_at_idx
  on public.case_study_drafts(created_at desc);

create index if not exists case_study_drafts_input_hash_idx
  on public.case_study_drafts(user_id, input_hash)
  where input_hash is not null;

alter table public.case_study_drafts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'case_study_drafts'
      and policyname = 'case_study_drafts_self'
  ) then
    create policy "case_study_drafts_self"
      on public.case_study_drafts for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
