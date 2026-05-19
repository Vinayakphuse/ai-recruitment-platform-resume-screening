import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/contexts/UserProfileContext";

export interface RecruiterProfile {
  id: string;
  userId: string;
  name: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  location: string | null;
  role: string | null;
  logoUrl: string | null;
  description: string | null;
  hiringFocus: string[];
  onboardingCompleted: boolean;
}

export type AppRole = "candidate" | "recruiter";

interface RecruiterContextType {
  recruiter: RecruiterProfile | null;
  roles: AppRole[];
  isRecruiter: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const RecruiterContext = createContext<RecruiterContextType | undefined>(undefined);

const mapRow = (row: any): RecruiterProfile => ({
  id: row.id,
  userId: row.user_id,
  name: row.name || "",
  companyName: row.company_name || "",
  website: row.website,
  industry: row.industry,
  companySize: row.company_size,
  location: row.location,
  role: row.role,
  logoUrl: row.logo_url,
  description: row.description,
  hiringFocus: Array.isArray(row.hiring_focus) ? row.hiring_focus : [],
  onboardingCompleted: !!row.onboarding_completed,
});

export const RecruiterProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUserProfile();
  const [recruiter, setRecruiter] = useState<RecruiterProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setRecruiter(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    // Do NOT flip `loading` back to true on refresh — that would unmount
    // routed children (e.g. the onboarding wizard) and reset their local state.
    const [{ data: rolesData }, { data: recRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("recruiter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setRoles((rolesData || []).map((r: any) => r.role));
    setRecruiter(recRow ? mapRow(recRow) : null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <RecruiterContext.Provider
      value={{
        recruiter,
        roles,
        isRecruiter: roles.includes("recruiter"),
        loading,
        refresh: load,
      }}
    >
      {children}
    </RecruiterContext.Provider>
  );
};

export const useRecruiter = () => {
  const ctx = useContext(RecruiterContext);
  if (!ctx) throw new Error("useRecruiter must be used within RecruiterProvider");
  return ctx;
};
