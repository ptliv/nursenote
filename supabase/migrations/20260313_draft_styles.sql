-- SOAP / 실습일지 / 케이스스터디 초안에 출력 스타일 저장
-- style: narrative | clinical | hybrid

alter table public.soap_notes
  add column if not exists style text not null default 'hybrid';

alter table public.journal_drafts
  add column if not exists style text not null default 'hybrid';

alter table public.case_study_drafts
  add column if not exists style text not null default 'hybrid';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'soap_notes_style_check'
  ) then
    alter table public.soap_notes
      add constraint soap_notes_style_check
      check (style in ('narrative', 'clinical', 'hybrid'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_drafts_style_check'
  ) then
    alter table public.journal_drafts
      add constraint journal_drafts_style_check
      check (style in ('narrative', 'clinical', 'hybrid'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_study_drafts_style_check'
  ) then
    alter table public.case_study_drafts
      add constraint case_study_drafts_style_check
      check (style in ('narrative', 'clinical', 'hybrid'));
  end if;
end
$$;
