-- ============================================================
-- NurseNote MVP용 Supabase DB 스키마 v2
-- 실행 순서: Supabase Dashboard > SQL Editor에 붙여넣고 실행
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------
-- 1. profiles
-- auth.users와 1:1 연결됩니다. 회원 가입 시 트리거로 자동 생성됩니다.
-- ------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '사용자',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 2. subscriptions
-- 플랜 상태를 관리합니다. 회원 가입 시 free 구독이 자동 생성됩니다.
-- ------------------------------------------------------------------

create table public.subscriptions (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null unique references public.profiles(id) on delete cascade,
  status               text not null default 'free'
                       check (status in ('free', 'pro', 'cancelled')),
  current_period_end   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 3. practice_notes
-- 실습 메모 원본 테이블입니다. AI 기능(SOAP, 실습일지, 케이스스터디)의 기반이 됩니다.
-- ------------------------------------------------------------------

create table public.practice_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  content     text not null,
  category    text not null default 'general'
              check (category in ('general', 'patient', 'procedure', 'medication', 'education')),
  tags        text[] not null default '{}',
  -- AI 생성 결과 연결용 필드입니다. 추후 soap_notes FK로 확장 가능합니다.
  soap_id     uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index practice_notes_user_id_idx on public.practice_notes(user_id);
create index practice_notes_updated_at_idx on public.practice_notes(updated_at desc);

-- ------------------------------------------------------------------
-- 4. soap_notes
-- SOAP 초안 결과를 저장합니다. 원본 practice_notes와 연결 가능합니다.
-- ------------------------------------------------------------------

create table public.soap_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  note_id     uuid references public.practice_notes(id) on delete set null,
  source_text text not null,
  input_hash  text,
  style       text not null default 'hybrid'
              check (style in ('narrative', 'clinical', 'hybrid')),
  subjective  text not null,
  objective   text not null,
  assessment  text not null,
  plan        text not null,
  created_at  timestamptz not null default now()
);

create index soap_notes_user_id_idx on public.soap_notes(user_id);
create index soap_notes_note_id_idx on public.soap_notes(note_id);
create index soap_notes_input_hash_idx
  on public.soap_notes(user_id, input_hash)
  where input_hash is not null;
create index soap_notes_created_at_idx on public.soap_notes(created_at desc);

-- ------------------------------------------------------------------
-- 5. journal_drafts
-- 실습일지 초안을 저장합니다. practice_notes + soap_notes 기반 결과입니다.
-- ------------------------------------------------------------------

create table public.journal_drafts (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  note_id                 uuid references public.practice_notes(id) on delete set null,
  soap_note_id            uuid not null references public.soap_notes(id) on delete cascade,
  source_text             text not null,
  input_hash              text,
  style                   text not null default 'hybrid'
                          check (style in ('narrative', 'clinical', 'hybrid')),
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

create index journal_drafts_user_id_idx on public.journal_drafts(user_id);
create index journal_drafts_note_id_idx on public.journal_drafts(note_id);
create index journal_drafts_soap_note_id_idx on public.journal_drafts(soap_note_id);
create index journal_drafts_input_hash_idx
  on public.journal_drafts(user_id, input_hash)
  where input_hash is not null;
create index journal_drafts_created_at_idx on public.journal_drafts(created_at desc);

-- ------------------------------------------------------------------
-- 6. case_study_drafts
-- 케이스스터디 초안을 저장합니다.
-- practice_notes + soap_notes + journal_drafts 기반 결과입니다.
-- ------------------------------------------------------------------

create table public.case_study_drafts (
  id                         uuid primary key default uuid_generate_v4(),
  user_id                    uuid not null references public.profiles(id) on delete cascade,
  note_id                    uuid references public.practice_notes(id) on delete set null,
  soap_note_id               uuid not null references public.soap_notes(id) on delete cascade,
  journal_draft_id           uuid not null references public.journal_drafts(id) on delete cascade,
  source_text                text not null,
  input_hash                 text,
  style                      text not null default 'hybrid'
                             check (style in ('narrative', 'clinical', 'hybrid')),
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

create index case_study_drafts_user_id_idx on public.case_study_drafts(user_id);
create index case_study_drafts_note_id_idx on public.case_study_drafts(note_id);
create index case_study_drafts_soap_note_id_idx on public.case_study_drafts(soap_note_id);
create index case_study_drafts_journal_draft_id_idx on public.case_study_drafts(journal_draft_id);
create index case_study_drafts_input_hash_idx
  on public.case_study_drafts(user_id, input_hash)
  where input_hash is not null;
create index case_study_drafts_created_at_idx on public.case_study_drafts(created_at desc);

-- ------------------------------------------------------------------
-- 7. drug_cards
-- 약물 학습 카드 데이터입니다. 현재는 공용 읽기 전용 시드 데이터로 사용합니다.
-- ------------------------------------------------------------------

create table public.drug_cards (
  id              uuid primary key default uuid_generate_v4(),
  name_ko         text not null,
  name_generic    text not null,
  category        text not null
                  check (category in ('analgesic','antibiotic','antihypertensive','anticoagulant','diuretic','other')),
  indication      text not null,
  common_dosage   text,
  side_effects    text[] not null default '{}',
  nursing_points  text[] not null default '{}',
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 트리거 함수
-- ------------------------------------------------------------------

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

create trigger practice_notes_updated_at
  before update on public.practice_notes
  for each row execute procedure public.set_updated_at();

-- 회원 가입 시 profiles + subscriptions 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', '사용자')
  );

  insert into public.subscriptions (user_id, status)
  values (new.id, 'free');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------
-- RLS 정책
-- ------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.practice_notes enable row level security;
alter table public.soap_notes enable row level security;
alter table public.journal_drafts enable row level security;
alter table public.case_study_drafts enable row level security;
alter table public.drug_cards enable row level security;

-- profiles: 본인만 조회/수정
create policy "profiles_self"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- subscriptions: 본인만 조회 가능
create policy "subscriptions_read_self"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- practice_notes: 본인만 CRUD
create policy "practice_notes_self"
  on public.practice_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- soap_notes: 본인만 CRUD
create policy "soap_notes_self"
  on public.soap_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- journal_drafts: 본인만 CRUD
create policy "journal_drafts_self"
  on public.journal_drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- case_study_drafts: 본인만 CRUD
create policy "case_study_drafts_self"
  on public.case_study_drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- drug_cards: 로그인한 사용자 전체 읽기 가능
create policy "drug_cards_authenticated_read"
  on public.drug_cards for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------------
-- drug_cards 시드 데이터
-- ------------------------------------------------------------------

insert into public.drug_cards (
  name_ko,
  name_generic,
  category,
  indication,
  common_dosage,
  side_effects,
  nursing_points
) values
(
  '푸로세미드',
  'Furosemide',
  'diuretic',
  '부종, 울혈성 심부전, 고혈압',
  '경구 20-80mg/일 (학습 참고용)',
  array['저칼륨혈증', '저나트륨혈증', '기립성 저혈압', '탈수'],
  array['섭취량/배설량(I/O) 모니터링', '체중 매일 측정', '전해질 수치 확인', '기립성 저혈압 교육', '햇빛 과민반응 주의']
),
(
  '아스피린',
  'Aspirin',
  'analgesic',
  '해열, 진통, 항혈소판 (심혈관 예방)',
  '항혈소판 100mg/일 (학습 참고용)',
  array['위장관 출혈', '이명', '과민반응', '레이 증후군(소아)'],
  array['식후 복용 권장 (위장 보호)', '출혈 경향성 모니터링', '수술 전 복용 중단 여부 확인', '소아에게 투여 금기']
),
(
  '암로디핀',
  'Amlodipine',
  'antihypertensive',
  '고혈압, 협심증',
  '5-10mg/일 (학습 참고용)',
  array['말초 부종', '두통', '안면홍조', '현기증'],
  array['혈압 및 맥박 투여 전 확인', '갑작스러운 중단 금지', '자몽 주스 상호작용 교육', '기립성 저혈압 주의']
),
(
  '와파린',
  'Warfarin',
  'anticoagulant',
  '심방세동, 심부정맥혈전증, 인공판막',
  'INR 목표에 따라 개별화 (학습 참고용)',
  array['출혈', '멍', '피부 괴사(드물게)'],
  array['PT/INR 정기 모니터링', '출혈 징후 관찰 (혈뇨, 흑변)', '비타민K 함유 식품 일관성 유지', '낙상 예방 교육', 'NSAIDs 등 약물 상호작용 주의']
),
(
  '세팔렉신',
  'Cephalexin',
  'antibiotic',
  '피부 및 연조직 감염, 요로감염',
  '250-500mg q6h (학습 참고용)',
  array['위장장애', '설사', '알레르기 반응', 'C.diff 감염'],
  array['페니실린 알레르기 교차 반응 확인', '충분한 수분 섭취 권장', '처방 기간 전체 복용 완료 교육', '배양 결과 확인 후 투여']
);
