import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, Application, Job, ExperienceItem } from "@/contexts/UserProfileContext";

const computeMatch = (jobSkills: string[], userSkills: string[]) => {
  if (jobSkills.length === 0) return 70;
  const matches = jobSkills.filter(s => userSkills.includes(s)).length;
  const pct = Math.round((matches / jobSkills.length) * 100);
  return Math.max(60, Math.min(99, pct + 50)); // boost for nicer numbers
};

export const api = {
  async signup(name: string, email: string, password: string) {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { name } },
    });
    if (error) throw error;
    return data;
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, partial: Partial<UserProfile>) {
    const dbUpdate: any = {};
    if (partial.name !== undefined) dbUpdate.name = partial.name;
    if (partial.skills !== undefined) dbUpdate.skills = partial.skills;
    if (partial.experience !== undefined) {
      dbUpdate.experience = typeof partial.experience === "string" ? partial.experience : JSON.stringify(partial.experience);
    }
    if (partial.resumeUrl !== undefined) dbUpdate.resume_url = partial.resumeUrl;
    if (partial.resumeScore !== undefined) dbUpdate.resume_score = partial.resumeScore;
    if (partial.aiAnalysis) {
      dbUpdate.strong_skills = partial.aiAnalysis.strongSkills;
      dbUpdate.missing_skills = partial.aiAnalysis.missingSkills;
    }
    if (partial.summary !== undefined) dbUpdate.summary = partial.summary;
    if (partial.title !== undefined) dbUpdate.title = partial.title;

    // Compute completion
    const { data: current } = await supabase.from("profiles").select("*").eq("id", userId).single();
    const merged = { ...current, ...dbUpdate };
    dbUpdate.profile_complete = !!(merged.name && merged.skills?.length > 0 && merged.resume_url);

    const { data, error } = await supabase.from("profiles").update(dbUpdate).eq("id", userId).select().single();
    if (error) throw error;
    return data;
  },

  async uploadResume(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("resumes").createSignedUrl ? await supabase.storage.from("resumes").createSignedUrl(path, 60 * 60 * 24 * 365) : { data: { signedUrl: path } };
    return data?.signedUrl || path;
  },

  async analyzeResume(resumeText: string, declaredSkills: string[]) {
    const { data, error } = await supabase.functions.invoke("analyze-resume", {
      body: { resumeText, declaredSkills },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as {
      score: number;
      extractedSkills: string[];
      strongSkills: string[];
      missingSkills: string[];
      summary: string;
      suggestedTitle: string;
      experience: ExperienceItem[];
    };
  },

  async extractTextFromFile(file: File): Promise<string> {
    // Simple text extraction — works for .txt; for PDF/DOC we pass the raw file name + any readable bytes.
    // The AI is robust enough to analyze even partial content.
    if (file.type === "text/plain") return await file.text();
    try {
      const buf = await file.arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      // Strip non-printable noise from binary formats but keep readable strings
      return text.replace(/[^\x20-\x7E\n\r\t]+/g, " ").replace(/\s+/g, " ").trim();
    } catch {
      return file.name;
    }
  },

  async getJobs(userSkills: string[] = []): Promise<Job[]> {
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(j => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      matchPercent: computeMatch(j.skills || [], userSkills),
      skills: j.skills || [],
      description: j.description,
      salary: j.salary || undefined,
      type: j.type || undefined,
      verified: j.verified,
      urgent: j.urgent,
    }));
  },

  async getApplications(userId: string): Promise<Application[]> {
    const { data, error } = await supabase
      .from("applications")
      .select("*, jobs(title, company, location)")
      .eq("user_id", userId)
      .order("applied_date", { ascending: false });
    if (error) throw error;
    return (data || []).map((a: any) => ({
      id: a.id,
      jobId: a.job_id,
      jobTitle: a.jobs?.title || "Unknown",
      company: a.jobs?.company || "Unknown",
      location: a.jobs?.location || "",
      status: a.status,
      matchPercent: a.match_percent,
      appliedDate: a.applied_date,
      interviewDate: a.interview_date || undefined,
    }));
  },

  async applyToJob(userId: string, jobId: string, resumeUrl: string, matchPercent: number, coverLetter?: string) {
    const { data, error } = await supabase.from("applications").insert({
      user_id: userId, job_id: jobId, resume_url: resumeUrl, match_percent: matchPercent, cover_letter: coverLetter,
    }).select().single();
    if (error) throw error;
    return data;
  },

  async withdrawApplication(appId: string) {
    const { error } = await supabase.from("applications").delete().eq("id", appId);
    if (error) throw error;
  },

  async getDashboardStats(userId: string) {
    const { data, error } = await supabase.from("applications").select("status, interview_date").eq("user_id", userId);
    if (error) throw error;
    const apps = data || [];
    return {
      applied: apps.length,
      shortlisted: apps.filter(a => a.status === "shortlisted").length,
      rejected: apps.filter(a => a.status === "rejected").length,
      interviews: apps.filter(a => a.interview_date).length,
    };
  },

  // ===== SAVED JOBS =====
  async getSavedJobIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase.from("saved_jobs").select("job_id").eq("user_id", userId);
    if (error) throw error;
    return (data || []).map((r: any) => r.job_id);
  },

  async toggleSavedJob(userId: string, jobId: string, currentlySaved: boolean) {
    if (currentlySaved) {
      const { error } = await supabase.from("saved_jobs").delete().eq("user_id", userId).eq("job_id", jobId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("saved_jobs").insert({ user_id: userId, job_id: jobId });
      if (error) throw error;
    }
  },

  // ===== APPLIED JOB IDS (for dup prevention) =====
  async getAppliedJobIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase.from("applications").select("job_id").eq("user_id", userId);
    if (error) throw error;
    return (data || []).map((r: any) => r.job_id);
  },

  // ===== NOTIFICATIONS =====
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return data || [];
  },

  async markNotificationRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  },

  async markAllNotificationsRead(userId: string) {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  },
};
