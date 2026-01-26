-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can acknowledge warnings" ON public.student_warnings;

-- Create a more restrictive policy that allows acknowledging by matching RA
-- This uses a function-based approach for safety
CREATE OR REPLACE FUNCTION public.acknowledge_warning(warning_id UUID, student_ra TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_warnings
  SET acknowledged = true, acknowledged_at = now()
  WHERE id = warning_id AND ra = student_ra AND acknowledged = false;
  
  RETURN FOUND;
END;
$$;