import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Briefcase, MapPin, X, Loader2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useRecruiter } from "@/contexts/RecruiterContext";
import { recruiterApi, RecruiterJob } from "@/lib/recruiterApi";
import RecruiterLayout from "@/components/RecruiterLayout";
import { supabase } from "@/integrations/supabase/client";

interface JobForm {
  title: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  skillsInput: string;
  urgent: boolean;
}

const empty: JobForm = {
  title: "",
  location: "Remote",
  type: "Full-time",
  salary: "",
  description: "",
  skillsInput: "",
  urgent: false,
};

const RecruiterJobs = () => {
  const { user } = useUserProfile();
  const { recruiter } = useRecruiter();
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecruiterJob | null>(null);
  const [form, setForm] = useState<JobForm>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const data = await recruiterApi.listJobs(user.id);
    setJobs(data);
    // counts per job
    if (data.length) {
      const { data: apps } = await supabase
        .from("applications")
        .select("job_id")
        .in("job_id", data.map((j) => j.id));
      const counts: Record<string, number> = {};
      (apps || []).forEach((a: any) => {
        counts[a.job_id] = (counts[a.job_id] || 0) + 1;
      });
      setAppCounts(counts);
    } else {
      setAppCounts({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("recruiter-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const startCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const startEdit = (job: RecruiterJob) => {
    setEditing(job);
    setForm({
      title: job.title,
      location: job.location,
      type: job.type || "Full-time",
      salary: job.salary || "",
      description: job.description,
      skillsInput: (job.skills || []).join(", "),
      urgent: job.urgent,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSaving(true);
    try {
      const skills = form.skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        title: form.title.trim(),
        location: form.location.trim() || "Remote",
        type: form.type,
        salary: form.salary.trim() || null,
        description: form.description.trim(),
        skills,
        urgent: form.urgent,
      };
      if (editing) {
        await recruiterApi.updateJob(editing.id, payload);
        toast.success("Job updated");
      } else {
        await recruiterApi.createJob(user.id, recruiter?.companyName || "Your Company", payload);
        toast.success("Job posted — candidates can now apply");
      }
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (job: RecruiterJob) => {
    if (!confirm(`Delete "${job.title}"? This will also remove all linked applications.`)) return;
    try {
      await recruiterApi.deleteJob(job.id);
      toast.success("Job deleted");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold mb-1">Jobs</h1>
            <p className="text-muted-foreground">
              {loading ? "Loading…" : `${jobs.length} active role${jobs.length === 1 ? "" : "s"} attracting candidates.`}
            </p>
          </div>
          <button
            onClick={startCreate}
            className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 shadow-glow hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Post a Job
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-card">
            <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">No jobs posted yet</h3>
            <p className="text-muted-foreground mb-5">Post your first role and start receiving applications.</p>
            <button
              onClick={startCreate}
              className="gradient-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm shadow-glow hover:opacity-90"
            >
              Post your first job
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl shadow-card p-6 hover:shadow-card-hover transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold text-lg truncate">{job.title}</h3>
                      {job.urgent && (
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      {job.type && <span>· {job.type}</span>}
                      {job.salary && <span>· {job.salary}</span>}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(job.skills || []).slice(0, 6).map((s) => (
                        <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="text-2xl font-heading font-bold text-primary">{appCounts[job.id] || 0}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 justify-end">
                        <Users className="w-3 h-3" /> Applicants
                      </p>
                    </div>
                    <button onClick={() => startEdit(job)}
                      className="p-2 rounded-lg hover:bg-secondary transition" aria-label="Edit job">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => remove(job)}
                      className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition" aria-label="Delete job">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl shadow-card-hover w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-xl">{editing ? "Edit Job" : "Post a Job"}</h2>
                  <p className="text-xs text-muted-foreground">Visible to all candidates instantly</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <Field label="Job title">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Frontend Engineer" className="input" required />
              </Field>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Location">
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Remote / NYC" className="input" />
                </Field>
                <Field label="Type">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </Field>
                <Field label="Salary (optional)">
                  <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    placeholder="$120k – $160k" className="input" />
                </Field>
              </div>
              <Field label="Required skills (comma separated)">
                <input value={form.skillsInput} onChange={(e) => setForm({ ...form, skillsInput: e.target.value })}
                  placeholder="React, TypeScript, GraphQL" className="input" />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6} placeholder="Role overview, responsibilities, requirements…" className="input resize-none" required />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })}
                  className="w-4 h-4 accent-primary" />
                Mark as urgent (highlighted to candidates)
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="gradient-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm shadow-glow disabled:opacity-60 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Save changes" : "Publish job"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.75rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          font-size: 0.875rem;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / .15); }
      `}</style>
    </RecruiterLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</span>
    {children}
  </label>
);

export default RecruiterJobs;
