import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Briefcase, Users, FileText, Sparkles, ArrowRight, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useRecruiter } from "@/contexts/RecruiterContext";
import { recruiterApi } from "@/lib/recruiterApi";
import RecruiterLayout from "@/components/RecruiterLayout";
import { supabase } from "@/integrations/supabase/client";

interface Metrics {
  activeJobs: number;
  totalApplications: number;
  shortlisted: number;
  interviews: number;
  totalResumes: number;
}

const RecruiterDashboard = () => {
  const { user } = useUserProfile();
  const { recruiter } = useRecruiter();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>({ activeJobs: 0, totalApplications: 0, shortlisted: 0, interviews: 0, totalResumes: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [m, r] = await Promise.all([
      recruiterApi.getDashboardMetrics(user.id),
      recruiterApi.getRecentApplications(user.id, 5),
    ]);
    setMetrics(m);
    setRecent(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: refresh on application changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("recruiter-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-muted rounded-2xl ${className}`} />
  );

  const firstName = recruiter?.name?.split(" ")[0] || "there";

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1">Welcome back, {firstName}</h1>
          <p className="text-muted-foreground">
            {loading
              ? "Loading your latest activity..."
              : metrics.totalApplications > 0
                ? `You have ${metrics.totalApplications} application${metrics.totalApplications === 1 ? "" : "s"} across ${metrics.activeJobs} job${metrics.activeJobs === 1 ? "" : "s"}.`
                : "Post your first job to start receiving applications."}
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {loading ? (
            <>
              <Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" />
            </>
          ) : (
            <>
              <MetricCard label="Total Resumes" value={metrics.totalResumes} icon={FileText} hint="In your talent pool" variant="muted" />
              <MetricCard label="Shortlisted Candidates" value={metrics.shortlisted} icon={Users} hint="Top matches" variant="primary" />
              <MetricCard label="Active Job Roles" value={metrics.activeJobs} icon={Briefcase} hint="Open right now" variant="muted" />
            </>
          )}
        </div>

        {/* Recent activity + insight */}
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Recent Activity</h3>
              <button onClick={() => navigate("/recruiter/jobs")} className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
              </div>
            ) : recent.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl">
                <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold mb-1">No applications yet</p>
                <p className="text-sm text-muted-foreground mb-4">Post a job to start receiving candidate applications.</p>
                <button onClick={() => navigate("/recruiter/jobs/new")}
                  className="gradient-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-glow hover:opacity-90">
                  Post your first job
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map(a => (
                  <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/40 transition">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                      {(a.profiles?.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{a.profiles?.name || "Anonymous candidate"}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.profiles?.title || "Candidate"} · Applied to {a.jobs?.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{a.match_percent}%</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AI Score</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusClass(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="space-y-5">
            <div className="bg-card rounded-2xl shadow-card p-6">
              <h3 className="font-heading font-bold text-base mb-4">Pipeline Health</h3>
              <PipelineBar label="Applied" value={metrics.totalApplications} max={Math.max(metrics.totalApplications, 1)} />
              <PipelineBar label="Shortlisted" value={metrics.shortlisted} max={Math.max(metrics.totalApplications, 1)} />
              <PipelineBar label="Interview" value={metrics.interviews} max={Math.max(metrics.totalApplications, 1)} />
            </div>
            <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wider">Curator Suggestion</p>
              </div>
              <p className="text-sm leading-relaxed">
                {metrics.activeJobs === 0
                  ? "Create your first job brief to start matching candidates from our intelligence engine."
                  : metrics.shortlisted === 0
                    ? "Review your latest applications to start shortlisting top candidates."
                    : `You have ${metrics.shortlisted} shortlisted candidate${metrics.shortlisted === 1 ? "" : "s"} ready for interview scheduling.`}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </RecruiterLayout>
  );
};

const statusClass = (s: string) => {
  switch (s) {
    case "shortlisted": return "bg-success/15 text-success";
    case "interview": return "bg-info/15 text-info";
    case "offer": return "bg-primary/15 text-primary";
    case "rejected": return "bg-destructive/15 text-destructive";
    case "screening": return "bg-warning/15 text-warning";
    default: return "bg-muted text-muted-foreground";
  }
};

const MetricCard = ({ label, value, icon: Icon, hint, variant }: { label: string; value: number; icon: any; hint: string; variant: "primary" | "muted" }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className={`rounded-3xl p-6 ${variant === "primary" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-card shadow-card"}`}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className={`text-[10px] uppercase tracking-widest font-bold ${variant === "primary" ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
        <p className="text-4xl font-heading font-bold mt-2">{value.toLocaleString()}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${variant === "primary" ? "bg-primary-foreground/20" : "bg-accent"}`}>
        <Icon className={`w-5 h-5 ${variant === "primary" ? "text-primary-foreground" : "text-accent-foreground"}`} />
      </div>
    </div>
    <p className={`text-xs ${variant === "primary" ? "opacity-80" : "text-muted-foreground"} flex items-center gap-1`}>
      <TrendingUp className="w-3 h-3" /> {hint}
    </p>
  </motion.div>
);

const PipelineBar = ({ label, value, max }: { label: string; value: number; max: number }) => {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
        <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-foreground">{value} <span className="text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div className="h-full gradient-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default RecruiterDashboard;
