-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can check if RA is banned" ON public.banned_students;

-- Create a restrictive SELECT policy: only admins can read ban records
CREATE POLICY "Only admins can view banned students"
  ON public.banned_students
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
