import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, Briefcase, FileText, ArrowRight, ArrowLeft, X, Loader2, Upload } from "lucide-react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";

const steps = [
  { icon: User, label: "Basic Info" },
  { icon: Sparkles, label: "Skills" },
  { icon: Briefcase, label: "Experience" },
  { icon: FileText, label: "Resume" },
];

const ProfileSetup = () => {
  const { profile, refreshProfile } = useUserProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState(profile?.experience || "");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput("");
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    // Final step - save all
    setLoading(true);
    try {
      if (!profile) return;
      let resumeUrl = profile.resumeUrl || "";
      let resumeText = "";
      if (resumeFile) {
        resumeUrl = await api.uploadResume(profile.id, resumeFile);
        resumeText = await api.extractTextFromFile(resumeFile);
      }
      await api.updateProfile(profile.id, { name, skills, experience, resumeUrl });
      if (resumeUrl) {
        // Use experience text as fallback so AI always has content to analyze
        const textForAi = resumeText && resumeText.length > 50
          ? resumeText
          : `Name: ${name}\nExperience: ${experience}\nSelf-declared skills: ${skills.join(", ")}`;
        try {
          const analysis = await api.analyzeResume(textForAi, skills);
          const mergedSkills = Array.from(new Set([...skills, ...(analysis.extractedSkills || [])]));
          await api.updateProfile(profile.id, {
            skills: mergedSkills,
            resumeScore: analysis.score,
            summary: analysis.summary,
            title: analysis.suggestedTitle,
            aiAnalysis: {
              strongSkills: analysis.strongSkills,
              missingSkills: analysis.missingSkills,
            },
          });
        } catch (aiErr: any) {
          console.error("AI analysis failed:", aiErr);
          // Non-fatal — continue to dashboard
        }
      }
      await refreshProfile();
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return skills.length > 0;
    if (step === 2) return experience.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg bg-card rounded-2xl shadow-card p-8">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                i <= step ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                <s.icon className="w-5 h-5" />
              </div>
              {i < 3 && <div className={`hidden md:block w-12 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {step === 0 && (
              <div>
                <h2 className="text-xl font-heading font-bold mb-1">What's your name?</h2>
                <p className="text-muted-foreground text-sm mb-6">This will appear on your professional profile.</p>
                <input type="text" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
              </div>
            )}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-heading font-bold mb-1">Add your skills</h2>
                <p className="text-muted-foreground text-sm mb-6">This helps our AI find the best job matches.</p>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="e.g. React, Figma..." value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
                  <button onClick={addSkill} className="px-4 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium">
                      {s}
                      <button onClick={() => setSkills(skills.filter(sk => sk !== s))}><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-heading font-bold mb-1">Your experience</h2>
                <p className="text-muted-foreground text-sm mb-6">Briefly describe your professional experience.</p>
                <textarea rows={4} placeholder="e.g. 5 years in product design..." value={experience} onChange={e => setExperience(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none" />
              </div>
            )}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-heading font-bold mb-1">Upload your resume</h2>
                <p className="text-muted-foreground text-sm mb-6">Our AI will analyze it to find perfect matches.</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 transition">
                  <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium text-foreground">{resumeFile ? resumeFile.name : "Click to upload PDF"}</span>
                  <span className="text-xs text-muted-foreground mt-1">PDF, DOC up to 10MB</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setResumeFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <button onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}
            className="flex items-center gap-2 text-muted-foreground font-medium disabled:opacity-30">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={handleNext} disabled={!canProceed() || loading}
            className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 3 ? "Complete Setup" : "Next"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;
