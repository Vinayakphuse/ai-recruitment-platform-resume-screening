import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, TrendingDown, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";
import CandidateLayout from "@/components/CandidateLayout";

const Dashboard = () => {
  const { profile, jobs, setJobs } = useUserProfile();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ applied: 0, shortlisted: 0, rejected: 0, interviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    Promise.all([
      api.getDashboardStats(profile.id),
      api.getJobs(profile.skills),
    ]).then(([s, j]) => {
      setStats(s);
      setJobs(j);
    }).finally(() => setLoading(false));
  }, [profile, setJobs]);

  const completionPercent = profile ? (
    (profile.name ? 25 : 0) +
    (profile.skills.length > 0 ? 25 : 0) +
    (profile.resumeUrl ? 25 : 0) +
    (profile.experience ? 25 : 0)
  ) : 0;

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
  );

  return (
    <CandidateLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Completion Banner */}
        {completionPercent < 100 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="gradient-primary text-primary-foreground rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">Complete your profile to improve job matches</p>
              <p className="text-sm opacity-80 mt-1">Your profile is {completionPercent}% complete</p>
            </div>
            <button onClick={() => navigate("/setup")}
              className="px-4 py-2 rounded-xl bg-card/20 font-semibold text-sm hover:bg-card/30 transition flex items-center gap-2">
              Complete Now <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Resume Score */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-card p-6 flex flex-col items-center">
            {loading ? <Skeleton className="w-32 h-32 rounded-full" /> : (
              <>
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
                      strokeDasharray={`${(profile?.resumeScore || 0) / 100 * 327} 327`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-heading font-bold">{profile?.resumeScore || 0}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      {(profile?.resumeScore || 0) >= 80 ? "Excellent" : "Ready to Hire"}
                    </span>
                  </div>
                </div>
                <h3 className="font-heading font-bold text-lg">Resume Score</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Your profile is more competitive than {profile?.resumeScore || 0}% of candidates.
                </p>
                <button onClick={() => navigate("/resume-lab")} className="mt-3 text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                  Improve your score <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </motion.div>

          {/* Application Activity */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-bold text-lg">Application Activity</h3>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last 30 Days</span>
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-secondary rounded-xl p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Applied</p>
                    <p className="text-3xl font-heading font-bold">{stats.applied}</p>
                    <span className="text-xs text-success flex items-center justify-center gap-0.5 mt-1">
                      <TrendingUp className="w-3 h-3" /> +3
                    </span>
                  </div>
                  <div className="bg-secondary rounded-xl p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Shortlisted</p>
                    <p className="text-3xl font-heading font-bold">{stats.shortlisted}</p>
                    <span className="text-xs text-muted-foreground mt-1">Stable</span>
                  </div>
                  <div className="bg-secondary rounded-xl p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Rejected</p>
                    <p className="text-3xl font-heading font-bold">{String(stats.rejected).padStart(2, "0")}</p>
                    <span className="text-xs text-destructive flex items-center justify-center gap-0.5 mt-1">
                      <TrendingDown className="w-3 h-3" /> -1
                    </span>
                  </div>
                </div>
                <div className="bg-accent/50 rounded-xl p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Curator Insight</p>
                    <p className="text-sm text-muted-foreground">Your interview-to-application ratio has increased by 12% after the recent resume update. Keep it up!</p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* Top Job Matches */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-xl">Top Job Matches</h3>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {loading ? [0,1,2].map(i => <Skeleton key={i} className="h-48" />) :
              jobs.slice(0, 3).map((job) => (
                <div key={job.id} className="bg-card rounded-2xl shadow-card p-5 hover:shadow-card-hover transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {job.company.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full">{job.matchPercent}% MATCH</span>
                  </div>
                  <h4 className="font-heading font-bold text-base mb-1">{job.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{job.company} • {job.location}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {job.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground">{s}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/jobs/${job.id}`)}
                      className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition">View Details</button>
                    <button className="flex-1 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">Quick Apply</button>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </CandidateLayout>
  );
};

export default Dashboard;
