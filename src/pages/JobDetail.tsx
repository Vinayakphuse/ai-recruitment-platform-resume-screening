import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, DollarSign, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useUserProfile, type Job } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";
import CandidateLayout from "@/components/CandidateLayout";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, jobs, setJobs, applications, setApplications } = useUserProfile();
  const [job, setJob] = useState<Job | null>(null);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (jobs.length === 0 && profile) {
      api.getJobs(profile.skills).then(setJobs);
    }
  }, [profile, jobs.length, setJobs]);

  useEffect(() => {
    if (profile) api.getAppliedJobIds(profile.id).then(ids => setAppliedIds(new Set(ids)));
  }, [profile]);

  useEffect(() => {
    const found = jobs.find(j => j.id === id);
    if (found) setJob(found);
  }, [jobs, id]);

  const alreadyApplied = job ? appliedIds.has(job.id) : false;

  const handleApply = async () => {
    if (!profile || !job || alreadyApplied) return;
    setApplying(true);
    try {
      await api.applyToJob(profile.id, job.id, profile.resumeUrl, job.matchPercent, coverLetter);
      const newApps = await api.getApplications(profile.id);
      setApplications(newApps);
      setAppliedIds(new Set([...appliedIds, job.id]));
      setShowApply(false);
      navigate("/applications");
    } finally {
      setApplying(false);
    }
  };

  if (!job) {
    return <CandidateLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></CandidateLayout>;
  }

  const matchingSkills = profile?.skills.filter(s => job.skills.includes(s)) || [];
  const missingSkills = job.skills.filter(s => !profile?.skills.includes(s));

  return (
    <CandidateLayout>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">{job.company.charAt(0)}</div>
              <div>
                <h1 className="text-2xl font-heading font-bold">{job.title}</h1>
                <p className="text-muted-foreground">{job.company}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-success bg-success/10 px-3 py-1.5 rounded-full">{job.matchPercent}% Match</span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
            {job.salary && <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> {job.salary}</span>}
            {job.type && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.type}</span>}
          </div>

          <p className="text-foreground leading-relaxed mb-6">{job.description}</p>

          {alreadyApplied ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-success/10 text-success font-semibold">
              <CheckCircle2 className="w-4 h-4" /> You've already applied to this role
            </div>
          ) : (
            <button onClick={() => setShowApply(true)}
              className="gradient-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold shadow-glow hover:opacity-90 transition">
              Apply Now
            </button>
          )}
        </motion.div>

        {/* Match Breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl shadow-card p-6">
            <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-success" /> Matching Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {matchingSkills.length > 0 ? matchingSkills.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm font-medium">{s}</span>
              )) : <p className="text-sm text-muted-foreground">Update your skills to see matches</p>}
            </div>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-6">
            <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-warning" /> Missing Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {missingSkills.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-sm font-medium">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Apply Modal */}
        {showApply && (
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl shadow-lg p-8 w-full max-w-md">
              <h2 className="text-xl font-heading font-bold mb-1">Apply to {job.title}</h2>
              <p className="text-sm text-muted-foreground mb-6">at {job.company}</p>

              <div className="mb-4 p-3 rounded-xl bg-secondary text-sm">
                <p className="font-medium">Resume: {profile?.resumeUrl ? "✓ Attached" : "⚠ No resume uploaded"}</p>
              </div>

              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Cover Letter (optional)</label>
              <textarea rows={4} placeholder="Why are you a great fit..." value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none mb-6" />

              <div className="flex gap-3">
                <button onClick={() => setShowApply(false)} className="flex-1 py-3 rounded-xl border border-border font-medium hover:bg-secondary transition">Cancel</button>
                <button onClick={handleApply} disabled={applying}
                  className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  {applying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Application"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </CandidateLayout>
  );
};

export default JobDetail;
