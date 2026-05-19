
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  experience TEXT NOT NULL DEFAULT '',
  resume_url TEXT NOT NULL DEFAULT '',
  resume_score INTEGER NOT NULL DEFAULT 0,
  strong_skills TEXT[] NOT NULL DEFAULT '{}',
  missing_skills TEXT[] NOT NULL DEFAULT '{}',
  profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT,
  summary TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  salary TEXT,
  type TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);

-- Applications table
CREATE TYPE public.application_status AS ENUM ('applied', 'screening', 'shortlisted', 'interview', 'offer', 'rejected');

CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'applied',
  match_percent INTEGER NOT NULL DEFAULT 0,
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interview_date TIMESTAMPTZ,
  cover_letter TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own applications" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.applications
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Resumes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

CREATE POLICY "Users can upload own resumes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own resumes" ON storage.objects
  FOR SELECT USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own resumes" ON storage.objects
  FOR DELETE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed jobs
INSERT INTO public.jobs (title, company, location, skills, description, salary, verified, urgent) VALUES
  ('Senior Product Designer', 'Stellar Systems', 'Remote', ARRAY['Figma', 'Design Systems', 'Prototyping'], 'Lead product design for our core platform, working closely with engineering and product teams to deliver world-class user experiences.', '$120k-$160k', TRUE, FALSE),
  ('UX Researcher', 'MedTech Global', 'New York, NY', ARRAY['User Interviews', 'Qualitative Data', 'HealthTech'], 'Conduct user research to inform product decisions across our healthcare platform.', '$100k-$140k', FALSE, FALSE),
  ('Lead Frontend Engineer', 'FinFlow Labs', 'London, UK', ARRAY['React', 'TypeScript', 'Tailwind CSS'], 'Architect and build the next generation of our financial dashboard platform.', '$130k-$170k', FALSE, FALSE),
  ('AI Interface Designer', 'NeuraLink Research', 'San Francisco, CA', ARRAY['AI/ML', 'LLM Visualization', 'Vector Design', 'Python'], 'Bridge the gap between human intuition and machine learning models through innovative interface design.', '$140k-$180k', FALSE, TRUE),
  ('Visual Designer', 'Creative Flow', 'Remote', ARRAY['Branding', 'Illustrator', 'Motion'], 'Create stunning visual assets across our brand portfolio.', '$80k-$110k', FALSE, FALSE),
  ('Senior Backend Engineer', 'Cloudbyte', 'Berlin, DE', ARRAY['Node.js', 'PostgreSQL', 'AWS', 'Docker'], 'Design and scale our distributed backend systems serving millions of requests.', '$120k-$160k', TRUE, FALSE);
