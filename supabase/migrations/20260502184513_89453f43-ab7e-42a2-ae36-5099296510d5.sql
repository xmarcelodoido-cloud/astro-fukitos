ALTER TABLE public.ai_sessions
  ADD COLUMN IF NOT EXISTS quiz_passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_time_passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_minutes integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS quiz_attempts integer NOT NULL DEFAULT 0;