import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { recruiterApi, ApplicationStatus } from "@/lib/recruiterApi";
import RecruiterLayout from "@/components/RecruiterLayout";
import CandidateDrawer from "@/components/recruiter/CandidateDrawer";
import { supabase } from "@/integrations/supabase/client";

const STAGES: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: "applied", label: "Applied", color: "bg-info/10 text-info border-info/30" },
  { key: "screening", label: "Screening", color: "bg-warning/10 text-warning border-warning/30" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-primary/10 text-primary border-primary/30" },
  { key: "interview", label: "Interview", color: "bg-accent text-accent-foreground border-primary/40" },
  { key: "offer", label: "Offer", color: "bg-success/10 text-success border-success/30" },
];

const RecruiterPipeline = () => {
  const { user } = useUserProfile();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [openApp, setOpenApp] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const data = await recruiterApi.listApplicationsForRecruiter(user.id);
    setApps(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("recruiter-pipeline")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const move = async (app: any, direction: 1 | -1) => {
    const idx = STAGES.findIndex((s) => s.key === app.status);
    const next = STAGES[idx + direction];
    if (!next) return;
    setMovingId(app.id);
    try {
      await recruiterApi.updateApplicationStatus(app.id, next.key);
      toast.success(`Moved to ${next.label}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setMovingId(null);
    }
  };

  const reject = async (app: any) => {
    setMovingId(app.id);
    try {
      await recruiterApi.updateApplicationStatus(app.id, "rejected");
      toast.success("Marked as rejected");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setMovingId(null);
    }
  };

  const byStage = STAGES.map((s) => ({
    ...s,
    items: apps.filter((a) => a.status === s.key),
  }));

  return (
    <RecruiterLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1">Applicant Pipeline</h1>
          <p className="text-muted-foreground">
            Move candidates through stages — changes sync to candidate dashboards in real time.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-5 gap-4">
            {STAGES.map((s) => <div key={s.key} className="h-96 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-card">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl mb-1">No applications yet</h3>
            <p className="text-muted-foreground">When candidates apply to your jobs, they'll appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {byStage.map((stage) => (
              <div key={stage.key} className="bg-card rounded-2xl shadow-card flex flex-col min-h-[400px]">
                <div className={`px-4 py-3 border-b border-border flex items-center justify-between rounded-t-2xl border-b-2 ${stage.color}`}>
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider">{stage.label}</h3>
                  <span className="text-xs font-bold bg-background/60 px-2 py-0.5 rounded-full">{stage.items.length}</span>
                </div>
                <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[70vh]">
                  {stage.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No candidates</p>
                  ) : (
                    stage.items.map((app) => (
                      <motion.div key={app.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => setOpenApp(app)}
                        className="bg-background border border-border rounded-xl p-3 hover:border-primary/40 transition cursor-pointer">
                        <div className="flex items-start gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                            {(app.profiles?.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{app.profiles?.name || "Anonymous"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{app.jobs?.title}</p>
                          </div>
                          <span className="text-[10px] font-bold text-primary shrink-0">{app.match_percent}%</span>
                        </div>
                        {app.profiles?.email && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1 truncate">
                            <Mail className="w-2.5 h-2.5" /> {app.profiles.email}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2.5 gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); move(app, -1); }}
                            disabled={STAGES.findIndex((s) => s.key === app.status) === 0 || movingId === app.id}
                            className="p-1 rounded hover:bg-secondary disabled:opacity-30">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); reject(app); }}
                            disabled={movingId === app.id}
                            className="text-[10px] font-semibold text-muted-foreground hover:text-destructive">
                            Reject
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); move(app, 1); }}
                            disabled={STAGES.findIndex((s) => s.key === app.status) === STAGES.length - 1 || movingId === app.id}
                            className="p-1 rounded hover:bg-secondary disabled:opacity-30">
                            {movingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CandidateDrawer app={openApp} onClose={() => setOpenApp(null)} onUpdated={load} />
    </RecruiterLayout>
  );
};

export default RecruiterPipeline;
