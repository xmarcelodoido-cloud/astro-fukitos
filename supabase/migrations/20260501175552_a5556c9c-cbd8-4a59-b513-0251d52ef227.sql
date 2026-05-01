
CREATE TYPE public.ai_session_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE public.ai_message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE public.ai_hint_level AS ENUM ('none', 'light', 'medium', 'deep');

CREATE TABLE public.ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ra text NOT NULL,
  student_name text,
  task_id text NOT NULL,
  task_title text NOT NULL,
  task_content text,
  status public.ai_session_status NOT NULL DEFAULT 'active',
  hint_level integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  score integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_ai_sessions_ra ON public.ai_sessions(ra);
CREATE INDEX idx_ai_sessions_status ON public.ai_sessions(status);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  role public.ai_message_role NOT NULL,
  content text NOT NULL,
  hint_level public.ai_hint_level NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_session ON public.ai_messages(session_id);

ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create sessions" ON public.ai_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view sessions" ON public.ai_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update sessions" ON public.ai_sessions FOR UPDATE USING (true);
CREATE POLICY "Admins can delete sessions" ON public.ai_sessions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create messages" ON public.ai_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view messages" ON public.ai_messages FOR SELECT USING (true);
CREATE POLICY "Admins can delete messages" ON public.ai_messages FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON public.ai_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
