import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Briefcase, Users, FileText, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { recruiterApi } from "@/lib/recruiterApi";
import RecruiterLayout from "@/components/RecruiterLayout";
import { supabase } from "@/integrations/supabase/client";

interface Analytics {
  funnel: { stage: string; count: number }[];
  skillDemand: { skill: string; count: number }[];
  trend: { date: string; count: number }[];
  totals: { applications: number; jobs: number; pool: number; avgMatch: number };
}

const EMPTY_ANALYTICS: Analytics = {
  funnel: [],
  skillDemand: [],
  trend: [],
  totals: { applications: 0, jobs: 0, pool: 0, avgMatch: 0 },
};

const RecruiterAnalytics = () => {
  const { user } = useUserProfile();
  const [data, setData] = useState<Analytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const a = await recruiterApi.getAnalytics(user.id);
    setData(a);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("recruiter-analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const chartTooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem",
    fontSize: "0.75rem",
    color: "hsl(var(--foreground))",
  } as const;

  const isEmpty = !loading && data.totals.applications === 0 && data.totals.jobs === 0;

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1">Analytics</h1>
          <p className="text-muted-foreground">Live hiring insights from your real pipeline data.</p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Applications" value={data.totals.applications} icon={Users} loading={loading} />
          <Stat label="Active Jobs" value={data.totals.jobs} icon={Briefcase} loading={loading} />
          <Stat label="Talent Pool" value={data.totals.pool} icon={FileText} loading={loading} />
          <Stat label="Avg Match" value={`${data.totals.avgMatch}%`} icon={Sparkles} loading={loading} primary />
        </div>

        {isEmpty ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-card">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl mb-1">Not enough data yet</h3>
            <p className="text-muted-foreground">Post a job and start collecting applications to see live analytics.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Funnel */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl shadow-card p-6">
              <h3 className="font-heading font-bold text-lg mb-1">Hiring Funnel</h3>
              <p className="text-xs text-muted-foreground mb-5">How candidates progress through your pipeline</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.funnel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Trend */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-heading font-bold text-lg mb-1">Application Trend</h3>
                <p className="text-xs text-muted-foreground mb-5">Last 14 days</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="appG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#appG)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Skills */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-heading font-bold text-lg mb-1">Skill Demand</h3>
                <p className="text-xs text-muted-foreground mb-5">Most-required skills across your jobs</p>
                {data.skillDemand.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">Add skills to your jobs to see this chart.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.skillDemand} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                      <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "hsl(var(--accent))" }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
};

const Stat = ({ label, value, icon: Icon, loading, primary }: any) => (
  <div className={`rounded-2xl p-5 ${primary ? "gradient-primary text-primary-foreground shadow-glow" : "bg-card shadow-card"}`}>
    <div className="flex items-center justify-between mb-2">
      <p className={`text-[10px] uppercase tracking-widest font-bold ${primary ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
      <Icon className={`w-4 h-4 ${primary ? "opacity-80" : "text-muted-foreground"}`} />
    </div>
    {loading
      ? <div className={`h-8 w-16 rounded-md animate-pulse ${primary ? "bg-primary-foreground/20" : "bg-muted"}`} />
      : <p className="text-3xl font-heading font-bold">{value}</p>
    }
  </div>
);

export default RecruiterAnalytics;
