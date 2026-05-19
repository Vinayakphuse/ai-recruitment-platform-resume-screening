import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, FileText, Mail, Briefcase, Loader2, Trash2, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { recruiterApi } from "@/lib/recruiterApi";
import { useUserProfile } from "@/contexts/UserProfileContext";

interface Props {
  app: any | null;
  onClose: () => void;
  onUpdated: () => void;
}

const CandidateDrawer = ({ app, onClose, onUpdated }: Props) => {
  const { user } = useUserProfile();
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [interview, setInterview] = useState("");
  const [savingInterview, setSavingInterview] = useState(false);

  useEffect(() => {
    if (!app || !user) return;
    setLoadingNotes(true);
    recruiterApi.listNotes(user.id, app.user_id).then(setNotes).finally(() => setLoadingNotes(false));
    setInterview(app.interview_date ? new Date(app.interview_date).toISOString().slice(0, 16) : "");
  }, [app, user]);

  if (!app) return null;

  const candidate = app.profiles || {};

  const addNote = async () => {
    if (!user || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const created = await recruiterApi.addNote(user.id, app.user_id, app.id, newNote.trim());
      setNotes([created, ...notes]);
      setNewNote("");
      toast.success("Note added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async (id: string) => {
    await recruiterApi.deleteNote(id);
    setNotes(notes.filter(n => n.id !== id));
  };

  const saveInterview = async () => {
    setSavingInterview(true);
    try {
      const iso = interview ? new Date(interview).toISOString() : null;
      await recruiterApi.setInterviewDate(app.id, iso);
      toast.success(iso ? "Interview scheduled" : "Interview cleared");
      onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSavingInterview(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50"
        onClick={onClose}
      >
        <motion.aside
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-card overflow-y-auto"
        >
          <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
            <p className="font-heading font-bold">Candidate Details</p>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-5 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                {(candidate.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-heading font-bold truncate">{candidate.name || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground truncate">{candidate.title || "Candidate"}</p>
                {candidate.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {candidate.email}</p>
                )}
              </div>
              <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{app.match_percent}%</span>
            </div>

            {/* Job */}
            <div className="bg-secondary rounded-xl p-3 text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{app.jobs?.title}</span>
              <span className="ml-auto text-xs uppercase tracking-wider font-semibold text-muted-foreground">{app.status}</span>
            </div>

            {/* Skills */}
            {candidate.skills && candidate.skills.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((s: string) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Resume */}
            {app.resume_url && (
              <a href={app.resume_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition w-full justify-center">
                <FileText className="w-4 h-4" /> View Resume <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}

            {/* Cover letter */}
            {app.cover_letter && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cover Letter</p>
                <p className="text-sm bg-secondary rounded-xl p-3 whitespace-pre-wrap">{app.cover_letter}</p>
              </div>
            )}

            {/* Interview Scheduling */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Interview
              </p>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={interview}
                  onChange={(e) => setInterview(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={saveInterview} disabled={savingInterview}
                  className="px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
                >
                  {savingInterview ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Candidate will be notified instantly.</p>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Private Notes</p>
              <div className="flex gap-2 mb-3">
                <textarea
                  rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this candidate…"
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <button onClick={addNote} disabled={savingNote || !newNote.trim()}
                  className="self-end px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-60">
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {loadingNotes ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              ) : notes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.id} className="bg-secondary rounded-xl p-3">
                      <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <button onClick={() => removeNote(n.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
};

export default CandidateDrawer;
