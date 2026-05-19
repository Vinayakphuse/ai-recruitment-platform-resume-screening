import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export interface ExperienceItem {
  duration: string;
  role: string;
  company: string;
  description: string;
  skills: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience: ExperienceItem[] | string;
  resumeUrl: string;
  resumeScore: number;
  aiAnalysis: { strongSkills: string[]; missingSkills: string[] };
  profileComplete: boolean;
  avatarUrl?: string;
  title?: string;
  summary?: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: "applied" | "screening" | "shortlisted" | "interview" | "offer" | "rejected";
  appliedDate: string;
  interviewDate?: string;
  matchPercent: number;
  location: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  matchPercent: number;
  skills: string[];
  description: string;
  salary?: string;
  type?: string;
  verified?: boolean;
  urgent?: boolean;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  applications: Application[];
  setApplications: (a: Application[]) => void;
  jobs: Job[];
  setJobs: (j: Job[]) => void;
  signOut: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const parseExperience = (exp: string | null) => {
  if (!exp) return [];
  try {
    const parsed = JSON.parse(exp);
    return Array.isArray(parsed) ? parsed : exp;
  } catch {
    return exp;
  }
};

const mapDbProfile = (row: any): UserProfile => ({
  id: row.id,
  name: row.name || "",
  email: row.email,
  skills: row.skills || [],
  experience: parseExperience(row.experience),
  resumeUrl: row.resume_url || "",
  resumeScore: row.resume_score || 0,
  aiAnalysis: {
    strongSkills: row.strong_skills || [],
    missingSkills: row.missing_skills || [],
  },
  profileComplete: row.profile_complete || false,
  avatarUrl: row.avatar_url,
  title: row.title,
  summary: row.summary,
});

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) { console.error("fetch profile error", error); return; }
    if (data) setProfile(mapDbProfile(data));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid deadlock
        setTimeout(() => fetchProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) fetchProfile(sess.user.id);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const updateProfile = useCallback((partial: Partial<UserProfile>) => {
    setProfile((prev) => prev ? { ...prev, ...partial } : null);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setApplications([]);
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        profile, setProfile, updateProfile, refreshProfile,
        isAuthenticated: !!session, user, session, authLoading,
        applications, setApplications,
        jobs, setJobs,
        signOut,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProfileProvider");
  return ctx;
};
