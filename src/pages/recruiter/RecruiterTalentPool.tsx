import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, Trash2, Sparkles, Users, Search, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { recruiterApi } from "@/lib/recruiterApi";
import RecruiterLayout from "@/components/RecruiterLayout";
import { supabase } from "@/integrations/supabase/client";

interface PoolCandidate {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  location: string | null;
  skills: string[];
  strong_skills: string[];
  missing_skills: string[];
  resume_score: number;
  summary: string | null;
  resume_url: string | null;
  source: string;
  created_at: string;
}

const RecruiterTalentPool = () => {
  const { user } = useUserProfile();
  const [pool, setPool] = useState<PoolCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const data = await recruiterApi.listPool(user.id);
    setPool(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("recruiter-pool")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "candidate_pool", filter: `recruiter_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleFiles = async (files: FileList | File[]) => {
    if (!user) return;
    const arr = Array.from(files);
    if (!arr.length) return;

    for (const file of arr) {
      const id = `${file.name}-${Date.now()}`;
      setUploading((u) => [...u, id]);
      try {
        const text = await recruiterApi.extractTextFromFile(file);
        if (text.trim().length < 20) {
          toast.error(`${file.name}: file content too short to analyze`);
          continue;
        }
        const analysis = await recruiterApi.analyzeResume(text, []);
        let resumeUrl: string | undefined;
        try {
          resumeUrl = await recruiterApi.uploadPoolResume(user.id, file);
        } catch {
          // storage failure shouldn't block AI insights
        }
        // derive a candidate name: try first non-empty line, fallback to file name
        const nameGuess =
          (text
            .split(/\n|\r/)
            .map((l) => l.trim())
            .find((l) => l.length > 2 && l.length < 60 && /[a-zA-Z]/.test(l)) ||
            file.name.replace(/\.[^.]+$/, "")).slice(0, 80);

        await recruiterApi.addPoolCandidate(user.id, {
          name: nameGuess,
          title: analysis.suggestedTitle,
          skills: analysis.extractedSkills,
          strong_skills: analysis.strongSkills,
          missing_skills: analysis.missingSkills,
          resume_url: resumeUrl,
          resume_score: analysis.score,
          summary: analysis.summary,
          source: "upload",
        });
        toast.success(`${file.name} analyzed — score ${analysis.score}`);
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message || "Analysis failed"}`);
      } finally {
        setUploading((u) => u.filter((x) => x !== id));
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this candidate from your pool?")) return;
    await recruiterApi.deletePoolCandidate(id);
    toast.success("Candidate removed");
  };

  const filtered = pool.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.title || "").toLowerCase().includes(q) ||
      c.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <RecruiterLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1">Talent Pool</h1>
          <p className="text-muted-foreground">
            Drop resumes and let AI extract skills, score, and ranking. Your private pool — only you can see these candidates.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition ${
            dragActive ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="font-heading font-bold text-lg mb-1">Drop resumes here</p>
          <p className="text-sm text-muted-foreground mb-3">PDF, DOC, DOCX or TXT — analyzed instantly with AI</p>
          <button type="button" className="gradient-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-glow">
            Choose files
          </button>
        </div>

        {/* In-progress uploads */}
        {uploading.length > 0 && (
          <div className="bg-card rounded-2xl shadow-card p-4 space-y-2">
            {uploading.map((id) => (
              <div key={id} className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-semibold">Analyzing</span>
                <span className="text-muted-foreground truncate">{id.split("-")[0]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search & list */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, title or skill…"
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-border bg-card text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
            <Users className="w-4 h-4" /> {pool.length} in pool
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-3xl">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">{pool.length === 0 ? "No candidates yet" : "No matches"}</p>
            <p className="text-sm text-muted-foreground">
              {pool.length === 0 ? "Upload resumes above to start building your pool." : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((c) => (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl shadow-card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                    {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-lg truncate">{c.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {c.title || "Candidate"}
                          {c.email && <> · <Mail className="w-3 h-3 inline" /> {c.email}</>}
                          {c.location && <> · <MapPin className="w-3 h-3 inline" /> {c.location}</>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span className="text-2xl font-heading font-bold text-primary">{c.resume_score}</span>
                        </div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">AI Score</p>
                      </div>
                    </div>
                    {c.summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.summary}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {c.strong_skills.slice(0, 5).map((s) => (
                        <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success">
                          {s}
                        </span>
                      ))}
                      {c.skills.filter((s) => !c.strong_skills.includes(s)).slice(0, 4).map((s) => (
                        <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      {c.resume_url && (
                        <a href={c.resume_url} target="_blank" rel="noreferrer"
                          className="text-xs font-semibold text-primary hover:underline">View resume →</a>
                      )}
                      <button onClick={() => remove(c.id)}
                        className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterTalentPool;
