-- Add foreign key from applications.user_id to profiles.id so PostgREST can embed profile data
ALTER TABLE public.applications
  ADD CONSTRAINT applications_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);

-- Attach the notification trigger that already exists as a function but isn't wired up
DROP TRIGGER IF EXISTS trg_notify_application_change ON public.applications;
CREATE TRIGGER trg_notify_application_change
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_change();

-- Ensure realtime is enabled for the relevant tables
ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='applications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.applications';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs';
  END IF;
END $$;