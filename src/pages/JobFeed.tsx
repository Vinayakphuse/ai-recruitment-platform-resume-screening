import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, ArrowUpDown, Zap, Bookmark, BookmarkCheck, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";
import CandidateLayout from "@/components/CandidateLayout";

const JobFeed = () => {
  const { profile, jobs, setJobs } = useUserProfile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    Promise.all([
      api.getJobs(profile.skills),
      api.getSavedJobIds(profile.id),
      api.getAppliedJobIds(profile.id),
    ]).then(([js, saved, applied]) => {
      setJobs(js);
      setSavedIds(new Set(saved));
      setAppliedIds(new Set(applied));
    }).finally(() => setLoading(false));
  }, [profile, setJobs]);

  const toggleSave = async (jobId: string) => {
    if (!profile) return;
    const isSaved = savedIds.has(jobId);
    const next = new Set(savedIds);
    if (isSaved) next.delete(jobId); else next.add(jobId);
    setSavedIds(next);
    try {
      await api.toggleSavedJob(profile.id, jobId, isSaved);
      toast.success(isSaved ? "Removed from saved" : "Job saved");
    } catch (e: any) {
      // revert
      setSavedIds(savedIds);
      toast.error(e.message || "Failed");
    }
  };

  const filtered = jobs.filter(j => {
    if (showSavedOnly && !savedIds.has(j.id)) return false;
    const q = search.toLowerCase();
    return j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.skills.some(s => s.toLowerCase().includes(q));
  });

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
  );

  return (
    <CandidateLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold mb-2">Curated Opportunities</h1>
          <p className="text-muted-foreground text-sm">AI-driven matches based on your latest Resume Lab analysis and career aspirations.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>
          <button
            onClick={() => setShowSavedOnly(s => !s)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
              showSavedOnly ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
            }`}>
            <Bookmark className="w-4 h-4" /> Saved {savedIds.size > 0 && `(${savedIds.size})`}
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition">
            <ArrowUpDown className="w-4 h-4" /> Sort: Best Match
          </button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg mb-1">{showSavedOnly ? "No saved jobs yet" : "No matches yet"}</h3>
            <p className="text-muted-foreground text-sm">
              {showSavedOnly ? "Tap the bookmark icon on any job to save it for later." : "Try adjusting your search or update your skills for better matches."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {filtered.map((job, i) => {
              const isSaved = savedIds.has(job.id);
              const isApplied = appliedIds.has(job.id);
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl shadow-card p-5 hover:shadow-card-hover transition-all flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                      {job.company.charAt(0)}
                    </div>
                    <div className="flex items-start gap-2">
                      <button onClick={() => toggleSave(job.id)} className="p-1.5 rounded-lg hover:bg-secondary transition" aria-label="Save job">
                        {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <div className="text-right">
                        <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full">{job.matchPercent}% Match</span>
                        {job.verified && <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">AI Verified</p>}
                        {job.urgent && <p className="text-[10px] text-destructive uppercase tracking-wider font-bold mt-1">Urgent Hire</p>}
                      </div>
                    </div>
                  </div>
                  <h4 className="font-heading font-bold text-base mb-1">{job.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{job.company} • {job.location}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {job.skills.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground">{s}</span>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button onClick={() => navigate(`/jobs/${job.id}`)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition">View Details</button>
                    {isApplied ? (
                      <button disabled className="flex-1 py-2.5 rounded-xl bg-success/10 text-success text-sm font-medium flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                      </button>
                    ) : (
                      <button onClick={() => navigate(`/jobs/${job.id}`)} className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Apply Now
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </CandidateLayout>
  );
};

export default JobFeed;
