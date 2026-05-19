import { supabase } from "@/integrations/supabase/client";

export type ApplicationStatus =
  | "applied"
  | "screening"
  | "shortlisted"
  | "interview"
  | "offer"
  | "rejected";

export interface RecruiterJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  salary?: string | null;
  type?: string | null;
  urgent: boolean;
  verified: boolean;
  recruiter_id: string | null;
  created_at: string;
}

export const recruiterApi = {
  async signup(name: string, email: string, password: string) {
    const redirectUrl = `${window.location.origin}/recruiter/onboarding`;
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

  async upsertProfile(userId: string, partial: Record<string, any>) {
    const payload: any = { user_id: userId, ...partial };
    const { data, error } = await supabase
      .from("recruiter_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadLogo(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) throw error;
    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    return data.publicUrl;
  },

  async completeOnboarding(userId: string) {
    const { error } = await supabase
      .from("recruiter_profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", userId);
    if (error) throw error;
  },

  async getDashboardMetrics(userId: string) {
    const [jobsRes, appsRes, poolRes] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("recruiter_id", userId),
      supabase
        .from("applications")
        .select("id, status, jobs!inner(recruiter_id)", { count: "exact" })
        .eq("jobs.recruiter_id", userId),
      supabase.from("candidate_pool").select("id", { count: "exact", head: true }).eq("recruiter_id", userId),
    ]);

    const apps = appsRes.data || [];
    return {
      activeJobs: jobsRes.count || 0,
      totalApplications: appsRes.count || 0,
      shortlisted: apps.filter((a: any) => a.status === "shortlisted").length,
      interviews: apps.filter((a: any) => a.status === "interview").length,
      totalResumes: poolRes.count || 0,
    };
  },

  async getRecentApplications(userId: string, limit = 5) {
    const { data, error } = await supabase
      .from("applications")
      .select("id, status, match_percent, applied_date, profiles(name, title), jobs!inner(title, recruiter_id)")
      .eq("jobs.recruiter_id", userId)
      .order("applied_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // ===== JOBS =====
  async listJobs(userId: string): Promise<RecruiterJob[]> {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("recruiter_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as RecruiterJob[];
  },

  async createJob(userId: string, companyName: string, payload: Partial<RecruiterJob>) {
    const insert = {
      recruiter_id: userId,
      company: companyName,
      title: payload.title || "",
      location: payload.location || "Remote",
      description: payload.description || "",
      skills: payload.skills || [],
      salary: payload.salary || null,
      type: payload.type || "Full-time",
      urgent: !!payload.urgent,
      verified: true,
    };
    const { data, error } = await supabase.from("jobs").insert(insert).select().single();
    if (error) throw error;
    return data as RecruiterJob;
  },

  async updateJob(jobId: string, payload: Partial<RecruiterJob>) {
    const update: any = {};
    ["title", "location", "description", "skills", "salary", "type", "urgent"].forEach((k) => {
      if ((payload as any)[k] !== undefined) update[k] = (payload as any)[k];
    });
    const { data, error } = await supabase.from("jobs").update(update).eq("id", jobId).select().single();
    if (error) throw error;
    return data as RecruiterJob;
  },

  async deleteJob(jobId: string) {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) throw error;
  },

  // ===== APPLICATIONS / PIPELINE =====
  async listApplicationsForRecruiter(userId: string) {
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, status, match_percent, applied_date, interview_date, cover_letter, resume_url, user_id, job_id, profiles(name, title, email, avatar_url, skills), jobs!inner(id, title, company, recruiter_id, skills)"
      )
      .eq("jobs.recruiter_id", userId)
      .order("applied_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateApplicationStatus(appId: string, status: ApplicationStatus) {
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (error) throw error;
  },

  async setInterviewDate(appId: string, dateIso: string | null) {
    const { error } = await supabase.from("applications").update({ interview_date: dateIso }).eq("id", appId);
    if (error) throw error;
  },

  // ===== RECRUITER NOTES =====
  async listNotes(recruiterId: string, candidateId: string) {
    const { data, error } = await supabase
      .from("recruiter_notes").select("*")
      .eq("recruiter_id", recruiterId).eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addNote(recruiterId: string, candidateId: string, applicationId: string | null, body: string) {
    const { data, error } = await supabase
      .from("recruiter_notes")
      .insert({ recruiter_id: recruiterId, candidate_id: candidateId, application_id: applicationId, body })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deleteNote(id: string) {
    await supabase.from("recruiter_notes").delete().eq("id", id);
  },

  // ===== TALENT POOL =====
  async listPool(userId: string) {
    const { data, error } = await supabase
      .from("candidate_pool")
      .select("*")
      .eq("recruiter_id", userId)
      .order("resume_score", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addPoolCandidate(userId: string, payload: {
    name: string;
    email?: string;
    title?: string;
    skills: string[];
    strong_skills: string[];
    missing_skills: string[];
    resume_url?: string;
    resume_score: number;
    summary?: string;
    source?: string;
  }) {
    const { data, error } = await supabase
      .from("candidate_pool")
      .insert({ recruiter_id: userId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePoolCandidate(id: string) {
    const { error } = await supabase.from("candidate_pool").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadPoolResume(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${userId}/pool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl || path;
  },

  async analyzeResume(resumeText: string, declaredSkills: string[] = []) {
    const { data, error } = await supabase.functions.invoke("analyze-resume", {
      body: { resumeText, declaredSkills },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as {
      score: number;
      extractedSkills: string[];
      strongSkills: string[];
      missingSkills: string[];
      summary: string;
      suggestedTitle: string;
    };
  },

  async extractTextFromFile(file: File): Promise<string> {
    if (file.type === "text/plain") return await file.text();
    try {
      const buf = await file.arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      return text.replace(/[^\x20-\x7E\n\r\t]+/g, " ").replace(/\s+/g, " ").trim();
    } catch {
      return file.name;
    }
  },

  // ===== ANALYTICS =====
  async getAnalytics(userId: string) {
    const [appsRes, jobsRes, poolRes] = await Promise.all([
      supabase
        .from("applications")
        .select("status, applied_date, match_percent, jobs!inner(title, skills, recruiter_id)")
        .eq("jobs.recruiter_id", userId),
      supabase.from("jobs").select("title, skills, created_at").eq("recruiter_id", userId),
      supabase.from("candidate_pool").select("resume_score, skills").eq("recruiter_id", userId),
    ]);

    const apps = appsRes.data || [];
    const jobs = jobsRes.data || [];
    const pool = poolRes.data || [];

    // Funnel
    const funnelOrder = ["applied", "screening", "shortlisted", "interview", "offer"];
    const funnel = funnelOrder.map((s) => ({
      stage: s.charAt(0).toUpperCase() + s.slice(1),
      count: apps.filter((a: any) => a.status === s || (s === "applied")).length === 0
        ? apps.filter((a: any) => a.status === s).length
        : apps.filter((a: any) => a.status === s).length,
    }));
    // Override "applied" to be total (every app started as applied)
    funnel[0].count = apps.length;

    // Skill demand from jobs
    const skillCounts = new Map<string, number>();
    jobs.forEach((j: any) => (j.skills || []).forEach((s: string) => {
      skillCounts.set(s, (skillCounts.get(s) || 0) + 1);
    }));
    const skillDemand = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    // Application trend (last 14 days)
    const today = new Date();
    const trend: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: apps.filter((a: any) => a.applied_date === key).length,
      });
    }

    return {
      funnel,
      skillDemand,
      trend,
      totals: {
        applications: apps.length,
        jobs: jobs.length,
        pool: pool.length,
        avgMatch: apps.length
          ? Math.round(apps.reduce((s: number, a: any) => s + (a.match_percent || 0), 0) / apps.length)
          : 0,
      },
    };
  },
};
