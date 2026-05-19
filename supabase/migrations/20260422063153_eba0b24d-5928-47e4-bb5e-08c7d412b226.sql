-- ============ SAVED JOBS ============
CREATE TABLE public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved jobs" ON public.saved_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved jobs" ON public.saved_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved jobs" ON public.saved_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
-- Inserts only via security-definer triggers (no direct insert policy)

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);

-- ============ RECRUITER NOTES ============
CREATE TABLE public.recruiter_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  application_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recruiter_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own notes" ON public.recruiter_notes
  FOR SELECT USING (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters insert own notes" ON public.recruiter_notes
  FOR INSERT WITH CHECK (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Recruiters update own notes" ON public.recruiter_notes
  FOR UPDATE USING (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters delete own notes" ON public.recruiter_notes
  FOR DELETE USING (auth.uid() = recruiter_id);

CREATE TRIGGER trg_recruiter_notes_updated
  BEFORE UPDATE ON public.recruiter_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ APPLICATION STATUS NOTIFICATION TRIGGER ============
CREATE OR REPLACE FUNCTION public.notify_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_title text;
  job_company text;
BEGIN
  SELECT title, company INTO job_title, job_company FROM public.jobs WHERE id = NEW.job_id;

  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.user_id,
      'Application status updated',
      COALESCE(job_title,'Your application') || ' at ' || COALESCE(job_company,'a company') || ' is now: ' || NEW.status,
      'status',
      '/applications'
    );
  END IF;

  IF (TG_OP = 'UPDATE' AND NEW.interview_date IS DISTINCT FROM OLD.interview_date AND NEW.interview_date IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.user_id,
      'Interview scheduled',
      'Interview for ' || COALESCE(job_title,'your application') || ' on ' || to_char(NEW.interview_date, 'Mon DD, YYYY HH24:MI'),
      'interview',
      '/applications'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_application_change
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_change();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;