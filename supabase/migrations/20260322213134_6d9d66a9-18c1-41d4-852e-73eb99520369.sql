CREATE TABLE public.task_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ra text NOT NULL,
  task_id text NOT NULL,
  title text,
  score integer DEFAULT 100,
  time_spent integer,
  success boolean DEFAULT true,
  room text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert task results"
ON public.task_results FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can view task results"
ON public.task_results FOR SELECT
TO public
USING (true);