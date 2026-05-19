import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, Calendar, Trash2, Loader2, Briefcase, Radio } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import CandidateLayout from "@/components/CandidateLayout";

const statusOrder = ["applied", "screening", "shortlisted", "interview", "offer"] as const;
const statusColors: Record<string, string> = {
  applied: "bg-info/10 text-info",
  screening: "bg-warning/10 text-warning",
  shortlisted: "bg-primary/10 text-primary",
  interview: "bg-success/10 text-success",
  offer: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const Applications = () => {
  const { profile, applications, setApplications } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    api.getApplications(profile.id).then(setApplications).finally(() => setLoading(false));

    // Realtime: listen for any changes to this user's applications
    const channel = supabase
      .channel("applications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          // Refresh from server to get joined job data
          const fresh = await api.getApplications(profile.id);
          setApplications(fresh);
          if (payload.eventType === "UPDATE") {
            const newStatus = (payload.new as any)?.status;
            if (newStatus && newStatus !== (payload.old as any)?.status) {
              toast.success(`Application status updated: ${newStatus}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, setApplications]);

  const handleWithdraw = async (appId: string) => {
    await api.withdrawApplication(appId);
    setApplications(applications.filter(a => a.id !== appId));
  };

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
  );

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-2">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1 flex items-center gap-2">
            Application Lifecycle
            <span className="inline-flex items-center gap-1 text-success normal-case tracking-normal">
              <Radio className="w-3 h-3 animate-pulse" /> Live
            </span>
          </p>
          <h1 className="text-3xl font-heading font-bold">
            Tracking your <span className="text-gradient">Professional Future.</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            We've analyzed {applications.length * 2} signals across your {applications.length} active applications.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 my-6">
          <div className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Active</p>
              <p className="text-2xl font-heading font-bold">{applications.filter(a => a.status !== "rejected").length}</p>
              <p className="text-xs text-muted-foreground">Applications Sent</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Upcoming</p>
              <p className="text-2xl font-heading font-bold">{applications.filter(a => a.interviewDate).length}</p>
              <p className="text-xs text-muted-foreground">Interviews Scheduled</p>
            </div>
          </div>
          <div className="gradient-primary text-primary-foreground rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider font-semibold opacity-80">AI Recommendation</p>
            <p className="font-heading font-bold mt-1">Refine your Portfolio</p>
            <p className="text-xs opacity-80 mt-1">Design teams at 3 active apps are looking for Case Studies.</p>
            <button className="mt-2 px-3 py-1.5 rounded-lg bg-card/20 text-xs font-semibold hover:bg-card/30 transition">Action Now</button>
          </div>
        </div>

        {/* Filters */}
        {applications.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(["all", ...statusOrder, "rejected"] as const).map((s) => {
              const count = s === "all" ? applications.length : applications.filter(a => a.status === s).length;
              const active = filter === s;
              return (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition border ${
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
                  }`}>
                  {s} <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Application List */}
        {loading ? (
          <div className="space-y-4">{[0,1,2].map(i => <Skeleton key={i} className="h-40" />)}</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg mb-1">No applications yet</h3>
            <p className="text-muted-foreground text-sm">Start applying to see your progress here.</p>
          </div>
        ) : (() => {
          const visible = filter === "all" ? applications : applications.filter(a => a.status === filter);
          if (visible.length === 0) {
            return (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <p className="font-heading font-bold mb-1">No applications in this stage</p>
                <p className="text-sm text-muted-foreground">Try a different filter.</p>
              </div>
            );
          }
          return (
          <div className="space-y-4">
            {visible.map((app, i) => {
              const currentIdx = statusOrder.indexOf(app.status as typeof statusOrder[number]);
              return (
                <motion.div key={app.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl shadow-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {app.company.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold">{app.jobTitle}</h4>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${statusColors[app.status]}`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{app.company} • {app.location}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      {app.interviewDate && (
                        <span className="text-xs gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(app.interviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">Applied {app.appliedDate}</span>
                      <button onClick={() => handleWithdraw(app.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Application Progress</p>
                    <p className="text-xs font-semibold text-primary">{app.matchPercent}% AI Match</p>
                  </div>
                  <div className="relative mt-3">
                    <div className="h-1.5 bg-border rounded-full">
                      <div className="h-full rounded-full gradient-primary transition-all"
                        style={{ width: `${((currentIdx + 1) / statusOrder.length) * 100}%` }} />
                    </div>
                    <div className="flex justify-between mt-2">
                      {statusOrder.map((s, idx) => (
                        <div key={s} className="flex flex-col items-center">
                          {idx < currentIdx ? (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          ) : idx === currentIdx ? (
                            <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                              <Circle className="w-2.5 h-2.5 text-primary-foreground fill-current" />
                            </div>
                          ) : (
                            <Circle className="w-5 h-5 text-border" />
                          )}
                          <span className={`text-[10px] mt-1 uppercase tracking-wider ${idx <= currentIdx ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                            {s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </CandidateLayout>
  );
};

export default Applications;
