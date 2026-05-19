import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Plus, X, Pencil, Star, Sparkles } from "lucide-react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";
import CandidateLayout from "@/components/CandidateLayout";

const ProfilePage = () => {
  const { profile, updateProfile, refreshProfile } = useUserProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [summary, setSummary] = useState(profile?.summary || "");
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && profile && !profile.skills.includes(s)) {
      updateProfile({ skills: [...profile.skills, s] });
      setSkillInput("");
    }
  };

  const removeSkill = (s: string) => {
    if (profile) updateProfile({ skills: profile.skills.filter(sk => sk !== s) });
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.updateProfile(profile.id, { name, summary });
      await refreshProfile();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (file: File) => {
    if (!profile) return;
    setParsing(true);
    try {
      const url = await api.uploadResume(profile.id, file);
      await api.updateProfile(profile.id, { resumeUrl: url });
      
      const text = await api.extractTextFromFile(file);
      const analysis = await api.analyzeResume(text, profile.skills);
      
      await api.updateProfile(profile.id, {
        summary: analysis.summary || profile.summary,
        title: analysis.suggestedTitle || profile.title,
        skills: [...new Set([...(profile.skills || []), ...(analysis.extractedSkills || [])])],
        aiAnalysis: {
          strongSkills: analysis.strongSkills,
          missingSkills: analysis.missingSkills,
        },
        experience: analysis.experience || profile.experience,
      });
      await refreshProfile();
    } catch (e) {
      console.error("Resume upload/parse error", e);
    } finally {
      setParsing(false);
    }
  };

  const completionPercent = profile ? (
    (profile.name ? 20 : 0) +
    (profile.skills.length > 0 ? 20 : 0) +
    (profile.resumeUrl ? 20 : 0) +
    (profile.experience ? 20 : 0) +
    (profile.summary ? 20 : 0)
  ) : 0;

  if (!profile) return null;

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Avatar + Name */}
            <div className="bg-card rounded-2xl shadow-card p-6 text-center">
              <div className="w-24 h-24 rounded-full gradient-primary mx-auto flex items-center justify-center text-primary-foreground text-3xl font-bold mb-4">
                {profile.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <h2 className="font-heading font-bold text-xl">{profile.name || "Your Name"}</h2>
              <p className="text-muted-foreground text-sm font-medium">{profile.title || "Professional"}</p>
              <p className="text-muted-foreground text-xs mt-1">{profile.email}</p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Profile Strength</span>
                  <span className="text-primary">{completionPercent}%</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Applied</p>
                  <p className="text-xl font-heading font-bold">24</p>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Interviews</p>
                  <p className="text-xl font-heading font-bold">6</p>
                </div>
              </div>
            </div>

            {/* Resume */}
            <div className="bg-card rounded-2xl shadow-card p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Active Resumes</p>
              {profile.resumeUrl ? (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile.name ? `${profile.name}.pdf` : "Resume.pdf"}</p>
                    <p className="text-xs text-muted-foreground">Updated recently</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-border rounded-xl mb-3">
                  <p className="text-sm text-muted-foreground font-medium mb-1">No resume uploaded</p>
                  <p className="text-xs text-muted-foreground">Upload your resume to auto-fill your profile.</p>
                </div>
              )}
              {parsing ? (
                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs font-semibold text-primary">Resume uploaded, parsing in progress...</span>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition">
                  <Upload className="w-6 h-6 text-primary mb-1" />
                  <span className="text-xs font-semibold text-primary">{profile.resumeUrl ? "Upload New Version" : "Upload Resume"}</span>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => e.target.files?.[0] && handleResumeUpload(e.target.files[0])} disabled={parsing} />
                </label>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <div className="bg-card rounded-2xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">Professional Summary</h3>
                <button onClick={() => setEditing(!editing)} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
              {editing ? (
                <div>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition mb-3" />
                  <textarea rows={4} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Write your professional summary..."
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none mb-3" />
                  <button onClick={handleSave} disabled={saving}
                    className="gradient-primary text-primary-foreground px-5 py-2 rounded-xl font-semibold text-sm hover:opacity-90 transition">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <p className="text-muted-foreground leading-relaxed">{profile.summary || "Add a professional summary to stand out."}</p>
              )}
            </div>

            {/* Skills */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" /> Technical Skills
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.skills.map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">
                      {s}
                      <button onClick={() => removeSkill(s)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSkill()}
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  <button onClick={addSkill} className="p-2 rounded-lg gradient-primary text-primary-foreground"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-warning" /> Core Competencies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.aiAnalysis?.strongSkills?.length > 0 ? profile.aiAnalysis.strongSkills : ["Product Strategy", "Team Leadership", "Stakeholder Management", "Rapid Prototyping"]).map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Experience */}
            <div className="bg-card rounded-2xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">Professional Experience</h3>
                <button className="p-2 rounded-lg hover:bg-secondary transition"><Plus className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              {Array.isArray(profile.experience) && profile.experience.length > 0 ? (
                <div className="space-y-6">
                  {profile.experience.map((exp: any, i: number) => (
                    <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-primary before:rounded-full after:absolute after:left-[3px] after:top-4 after:w-0.5 after:h-full after:bg-border last:after:hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-1">
                        <h4 className="font-bold text-foreground text-base">{exp.role}</h4>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full w-fit mt-1 md:mt-0">{exp.duration}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-2">{exp.company}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{exp.description}</p>
                      {exp.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {exp.skills.map((s: string) => (
                            <span key={s} className="text-[10px] font-semibold bg-secondary text-secondary-foreground px-2 py-1 rounded-md">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{typeof profile.experience === "string" && profile.experience ? profile.experience : "Add your experience to attract better opportunities."}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </CandidateLayout>
  );
};

export default ProfilePage;
