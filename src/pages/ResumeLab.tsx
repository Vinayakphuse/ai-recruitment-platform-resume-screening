import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { api } from "@/lib/api";
import CandidateLayout from "@/components/CandidateLayout";

const ResumeLab = () => {
  const { profile, updateProfile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(!!profile?.aiAnalysis?.strongSkills?.length);

  const runAnalysis = async () => {
    if (!profile?.resumeUrl) return;
    setLoading(true);
    try {
      const textForAi = `Name: ${profile.name}\nTitle: ${profile.title || ""}\nExperience: ${profile.experience}\nSummary: ${profile.summary || ""}\nSkills: ${profile.skills.join(", ")}`;
      const result = await api.analyzeResume(textForAi, profile.skills);
      const mergedSkills = Array.from(new Set([...profile.skills, ...(result.extractedSkills || [])]));
      await api.updateProfile(profile.id, {
        skills: mergedSkills,
        resumeScore: result.score,
        summary: result.summary,
        title: result.suggestedTitle,
        aiAnalysis: { strongSkills: result.strongSkills, missingSkills: result.missingSkills },
      });
      updateProfile({
        skills: mergedSkills,
        resumeScore: result.score,
        summary: result.summary,
        title: result.suggestedTitle,
        aiAnalysis: { strongSkills: result.strongSkills, missingSkills: result.missingSkills },
      });
      setAnalyzed(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.resumeUrl && !analyzed) runAnalysis();
  }, [profile?.resumeUrl]);

  const score = profile?.resumeScore || 0;
  const strong = profile?.aiAnalysis?.strongSkills || [];
  const missing = profile?.aiAnalysis?.missingSkills || [];

  return (
    <CandidateLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Curated Analysis</p>
            <h1 className="text-3xl font-heading font-bold">Resume Analysis</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {profile?.resumeUrl ? "Analysis based on your uploaded resume" : "Upload a resume to get AI insights"}
            </p>
          </div>
          {profile?.resumeUrl && (
            <button onClick={runAnalysis} disabled={loading}
              className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Improve Resume
            </button>
          )}
        </div>

        {!profile?.resumeUrl ? (
          <div className="text-center py-20 bg-card rounded-2xl shadow-card">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg mb-1">No resume uploaded</h3>
            <p className="text-muted-foreground text-sm">Upload your resume in Profile to get AI analysis.</p>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="h-2 bg-border rounded-full mb-8 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, delay: 0.3 }}
                className="h-full gradient-primary rounded-full" />
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Score */}
              <div className="bg-card rounded-2xl shadow-card p-6 flex flex-col items-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">AI Fit Score</p>
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
                      strokeDasharray={`${score / 100 * 327} 327`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-heading font-bold">{score}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      {score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Your profile ranks in the <strong>top {100 - score}%</strong> of applicants.
                </p>
              </div>

              {/* Strong Skills */}
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-success" /> Strong Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {strong.map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">{s}</span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-heading font-bold flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-destructive" /> Missing Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {missing.map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium">{s}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">Based on current market trends</p>
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-card rounded-2xl shadow-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> AI Actionable Insights
                </h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{missing.length} HIGH IMPACT EDITS</span>
              </div>
              <div className="space-y-4">
                {missing.slice(0, 3).map((skill, i) => (
                  <div key={skill} className="flex items-start gap-3 p-4 bg-secondary rounded-xl">
                    <TrendingUp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Learn {skill} <span className="text-xs text-destructive font-bold ml-1">CRITICAL</span></p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adding {skill} to your skill set could increase your match rate by ~{15 + i * 5}%.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </CandidateLayout>
  );
};

export default ResumeLab;
