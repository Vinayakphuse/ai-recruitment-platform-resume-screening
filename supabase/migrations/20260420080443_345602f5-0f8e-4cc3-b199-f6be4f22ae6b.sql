-- Allow recruiters to view profiles of candidates who applied to their jobs
CREATE POLICY "Recruiters can view applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.user_id = profiles.id
      AND j.recruiter_id = auth.uid()
  )
);