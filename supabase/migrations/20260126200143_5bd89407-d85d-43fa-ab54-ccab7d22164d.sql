-- Create warnings table
CREATE TABLE public.student_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ra TEXT NOT NULL,
  student_name TEXT,
  reason TEXT NOT NULL,
  warned_by UUID REFERENCES auth.users(id),
  warned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.student_warnings ENABLE ROW LEVEL SECURITY;

-- Anyone can check if they have warnings (to show the warning screen)
CREATE POLICY "Anyone can check warnings"
ON public.student_warnings
FOR SELECT
USING (true);

-- Only admins can insert warnings
CREATE POLICY "Only admins can add warnings"
ON public.student_warnings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update warnings
CREATE POLICY "Only admins can update warnings"
ON public.student_warnings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete warnings
CREATE POLICY "Only admins can delete warnings"
ON public.student_warnings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anyone to acknowledge their own warning (update acknowledged field)
CREATE POLICY "Anyone can acknowledge warnings"
ON public.student_warnings
FOR UPDATE
USING (true)
WITH CHECK (true);