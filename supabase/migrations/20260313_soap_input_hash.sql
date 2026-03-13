-- soap_notes 테이블에 input_hash 컬럼 추가
-- 동일 입력 중복 호출 방지(dedup) 용도. 보안 목적이 아님.
-- 배포 전 Supabase Dashboard > SQL Editor에서 실행할 것.

ALTER TABLE public.soap_notes
  ADD COLUMN IF NOT EXISTS input_hash text;

-- 부분 인덱스: input_hash가 있는 행만 인덱싱 (기존 데이터 제외)
CREATE INDEX IF NOT EXISTS soap_notes_input_hash_idx
  ON public.soap_notes (user_id, input_hash)
  WHERE input_hash IS NOT NULL;
