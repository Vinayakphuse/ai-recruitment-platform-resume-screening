-- 1. Roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('candidate', 'recruiter');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. recruiter_profiles
CREATE TABLE public.recruiter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  website TEXT,
  industry TEXT,
  company_size TEXT,
  location TEXT,
  role TEXT,
  logo_url TEXT,
  description TEXT,
  hiring_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own profile"
  ON public.recruiter_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Recruiters insert own profile"
  ON public.recruiter_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters update own profile"
  ON public.recruiter_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_recruiter_profiles_updated_at
  BEFORE UPDATE ON public.recruiter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When a recruiter profile is created, assign recruiter role
CREATE OR REPLACE FUNCTION public.assign_recruiter_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'recruiter')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_recruiter_role
  AFTER INSERT ON public.recruiter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_recruiter_role();

-- 3. candidate_pool (recruiter-owned ingested resumes)
CREATE TABLE public.candidate_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  title TEXT,
  location TEXT,
  experience TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  strong_skills TEXT[] NOT NULL DEFAULT '{}',
  missing_skills TEXT[] NOT NULL DEFAULT '{}',
  resume_url TEXT,
  resume_score INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  source TEXT NOT NULL DEFAULT 'upload',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own pool"
  ON public.candidate_pool FOR SELECT
  USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters insert own pool"
  ON public.candidate_pool FOR INSERT
  WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters update own pool"
  ON public.candidate_pool FOR UPDATE
  USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters delete own pool"
  ON public.candidate_pool FOR DELETE
  USING (auth.uid() = recruiter_id);

CREATE TRIGGER trg_candidate_pool_updated_at
  BEFORE UPDATE ON public.candidate_pool
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. jobs.recruiter_id + ownership policies
ALTER TABLE public.jobs ADD COLUMN recruiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Recruiters insert own jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Recruiters update own jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters delete own jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = recruiter_id);

-- 5. Default candidate role on signup (extend existing trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'candidate')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill candidate role for existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'candidate'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. company-logos public bucket + policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

CREATE POLICY "Public can view company logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Recruiters upload own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Recruiters update own logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Recruiters delete own logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );