import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Upload, Loader2, ArrowRight, Check, Plus, X } from "lucide-react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useRecruiter } from "@/contexts/RecruiterContext";
import { recruiterApi } from "@/lib/recruiterApi";
import { toast } from "sonner";

const INDUSTRIES = ["Technology", "Finance", "Healthcare", "E-commerce", "Education", "Media", "Manufacturing", "Other"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const ROLES = ["Founder / CEO", "Head of Talent", "HR Manager", "Recruiter", "Hiring Manager", "Other"];
const FOCUS_PRESETS = ["Engineering", "Design", "Marketing", "Sales", "Product", "Operations", "Data", "Finance"];

const RecruiterOnboarding = () => {
  const { user } = useUserProfile();
  const { recruiter, refresh } = useRecruiter();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [userRole, setUserRole] = useState("");

  // Step 2
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [hiringFocus, setHiringFocus] = useState<string[]>(["Engineering"]);
  const [customFocus, setCustomFocus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recruiter) {
      setName(recruiter.name);
      setCompanyName(recruiter.companyName);
      setWebsite(recruiter.website || "");
      setIndustry(recruiter.industry || "");
      setCompanySize(recruiter.companySize || "");
      setLocation(recruiter.location || "");
      setUserRole(recruiter.role || "");
      setDescription(recruiter.description || "");
      setHiringFocus(recruiter.hiringFocus.length ? recruiter.hiringFocus : ["Engineering"]);
      setLogoPreview(recruiter.logoUrl);
      if (recruiter.onboardingCompleted) navigate("/recruiter/dashboard", { replace: true });
    }
  }, [recruiter, navigate]);

  const handleLogo = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo must be under 5MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const toggleFocus = (f: string) => {
    setHiringFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const addCustomFocus = () => {
    const v = customFocus.trim();
    if (!v) return;
    if (!hiringFocus.includes(v)) setHiringFocus([...hiringFocus, v]);
    setCustomFocus("");
  };

  const saveStep1 = async () => {
    if (!user) return;
    if (!name || !companyName) { toast.error("Name and company name are required"); return; }
    setSaving(true);
    try {
      await recruiterApi.upsertProfile(user.id, {
        name, company_name: companyName, website: website || null,
        industry: industry || null, company_size: companySize || null,
        location: location || null, role: userRole || null,
      });
      await refresh();
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveStep2 = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let logoUrl = recruiter?.logoUrl || null;
      if (logoFile) {
        logoUrl = await recruiterApi.uploadLogo(user.id, logoFile);
      }
      await recruiterApi.upsertProfile(user.id, {
        logo_url: logoUrl,
        description: description || null,
        hiring_focus: hiringFocus,
      });
      await recruiterApi.completeOnboarding(user.id);
      await refresh();
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-heading font-bold text-primary">The Curator</span>
        </div>
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Onboarding step {step} of 3</span>
            <span className="text-primary">{progress}% complete</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div className="h-full gradient-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-5xl bg-card rounded-3xl shadow-card overflow-hidden grid md:grid-cols-2">
              <div className="p-10 flex flex-col justify-center">
                <h2 className="text-3xl font-heading font-bold mb-3">Welcome to your<br />Intelligence Hub.</h2>
                <p className="text-muted-foreground">Let's build your organization's digital twin to find the perfect matches for your team.</p>
                <div className="mt-8 p-5 rounded-2xl bg-accent/40">
                  <p className="text-sm font-semibold text-accent-foreground">🔒 Culture First</p>
                  <p className="text-xs text-muted-foreground mt-1">Our AI analyzes company size and industry to ensure cultural alignment in every match.</p>
                </div>
              </div>
              <div className="p-10 bg-gradient-to-br from-card to-secondary/30">
                <h3 className="text-2xl font-heading font-bold mb-1">Company Setup</h3>
                <p className="text-sm text-muted-foreground mb-6">Tell us about where you work to personalize your talent curation.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Company Name" value={companyName} onChange={setCompanyName} placeholder="e.g. Acme Corp" />
                  <Field label="Website" value={website} onChange={setWebsite} placeholder="https://acme.co" />
                  <Select label="Industry" value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select Industry" />
                  <Select label="Company Size" value={companySize} onChange={setCompanySize} options={SIZES} placeholder="Select Size" />
                  <div className="col-span-2">
                    <Field label="Headquarters Location" value={location} onChange={setLocation} placeholder="City, Country" />
                  </div>
                  <Field label="Your Name" value={name} onChange={setName} placeholder="Full Name" />
                  <Select label="Your Role" value={userRole} onChange={setUserRole} options={ROLES} placeholder="Select Role" />
                </div>
                <div className="flex gap-3 mt-8">
                  <button disabled={saving} onClick={saveStep1}
                    className="flex-1 gradient-primary text-primary-foreground py-3 rounded-full font-semibold shadow-glow hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to Branding <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-5xl bg-card rounded-3xl shadow-card overflow-hidden grid md:grid-cols-2">
              <div className="p-10 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-heading font-bold text-primary">The Curator</span>
                </div>
                <h2 className="text-4xl font-heading font-bold mb-3">Make Your<br />Company<br /><span className="text-gradient">Stand Out</span></h2>
                <p className="text-muted-foreground">The Intelligent Curator uses your brand identity to attract the right talent. Your profile will be the first impression for top-tier candidates.</p>
                <div className="mt-8 p-4 rounded-2xl bg-accent/30">
                  <p className="text-sm italic text-foreground">"A well-curated profile increases candidate engagement by up to 40%."</p>
                  <p className="text-xs text-muted-foreground mt-2">— Industry benchmark</p>
                </div>
              </div>
              <div className="p-10 bg-gradient-to-br from-card to-secondary/30 space-y-5">
                <div>
                  <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2 block">Company Logo</label>
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:bg-secondary/50 transition">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-20 h-20 object-contain mx-auto rounded-xl" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold">Drag & drop logo</p>
                        <p className="text-xs text-muted-foreground">PNG, SVG or JPG (Max 5MB)</p>
                      </>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={e => handleLogo(e.target.files?.[0] || null)} className="hidden" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Company Description</label>
                    <span className="text-xs text-muted-foreground">{description.length} / 500</span>
                  </div>
                  <textarea value={description} maxLength={500} onChange={e => setDescription(e.target.value)} rows={4}
                    placeholder="Tell candidates what makes your mission unique..."
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2 block">Hiring Focus</label>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set([...FOCUS_PRESETS, ...hiringFocus])].map(f => (
                      <button key={f} onClick={() => toggleFocus(f)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                          hiringFocus.includes(f)
                            ? "gradient-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-muted"
                        }`}>
                        {f}
                        {hiringFocus.includes(f) && !FOCUS_PRESETS.includes(f) && <X className="w-3 h-3" />}
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                      <input value={customFocus} onChange={e => setCustomFocus(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomFocus())}
                        placeholder="Add more"
                        className="px-3 py-1.5 rounded-full bg-card border border-border text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <button onClick={addCustomFocus} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button disabled={saving} onClick={saveStep2}
                    className="flex-1 gradient-primary text-primary-foreground py-3 rounded-full font-semibold shadow-glow hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finish Setup"}
                  </button>
                  <button onClick={() => setStep(1)}
                    className="px-6 py-3 rounded-full border-2 border-dashed border-border text-sm font-semibold hover:bg-secondary">
                    Back
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-3xl bg-card rounded-3xl shadow-card p-12 text-center">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
                <Check className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-4xl font-heading font-bold mb-3">You're all set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Start posting jobs and finding the right talent with our intelligent matching engine. Your workspace is configured and ready for growth.
              </p>
              <button onClick={() => navigate("/recruiter/dashboard")}
                className="gradient-primary text-primary-foreground px-8 py-3.5 rounded-full font-semibold shadow-glow hover:opacity-90 inline-flex items-center gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              <div className="mt-10 p-5 rounded-2xl bg-accent/30 max-w-md mx-auto text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Next recommended step</p>
                <p className="font-heading font-bold mb-1">Create your first Job Brief</p>
                <p className="text-sm text-muted-foreground">Our AI will instantly start scanning your talent pool to match your requirements.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
  </div>
);

const Select = ({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) => (
  <div>
    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition appearance-none">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default RecruiterOnboarding;
