import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, User, ArrowRight } from "lucide-react";

const roles = [
  {
    key: "recruiter",
    icon: Briefcase,
    title: "I'm a Recruiter",
    desc: "Access our AI-driven talent pool, automate screening, and build world-class teams with data-backed insights.",
  },
  {
    key: "candidate",
    icon: User,
    title: "I'm a Candidate",
    desc: "Personalize your professional journey, get matched with dream roles, and let our AI showcase your true potential.",
  },
] as const;

const RoleSelection = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const routeFor = (key: string) => key === "recruiter" ? "/recruiter/login" : "/login";

  const handleCardClick = (key: string) => {
    if (selected === key) {
      navigate(routeFor(key));
    } else {
      setSelected(key);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <header className="flex items-center justify-between px-8 py-5">
        <span className="text-xl font-heading font-bold text-primary">TalentPulse AI</span>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">ABOUT</a>
          <a href="#" className="hover:text-foreground transition-colors">PRICING</a>
          <a href="#" className="hover:text-foreground transition-colors">SUPPORT</a>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-3">
            Welcome to AI Hiring Platform
          </h1>
          <p className="text-muted-foreground text-lg">Choose how you want to continue</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full mb-12">
          {roles.map((role, i) => (
            <motion.button
              key={role.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              onClick={() => handleCardClick(role.key)}
              className={`relative p-8 rounded-2xl text-left transition-all duration-300 bg-card border-2 ${
                selected === role.key
                  ? "border-primary shadow-glow"
                  : "border-transparent shadow-card hover:shadow-card-hover"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                selected === role.key ? "gradient-primary" : "bg-accent"
              }`}>
                <role.icon className={`w-6 h-6 ${selected === role.key ? "text-primary-foreground" : "text-accent-foreground"}`} />
              </div>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">{role.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{role.desc}</p>
              <div className="mt-6">
                <span className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all ${
                  selected === role.key
                    ? "gradient-primary text-primary-foreground"
                    : "border-2 border-dashed border-border text-muted-foreground"
                }`}>
                  Continue <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center gap-8 text-xs font-semibold text-muted-foreground tracking-widest uppercase">
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">🏢</span>
            Trusted by top tech
          </span>
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">🎯</span>
            50K+ matches made
          </span>
        </motion.div>

        {selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-8">
            <button
              onClick={() => navigate(routeFor(selected))}
              className="gradient-primary text-primary-foreground px-8 py-3 rounded-full font-semibold shadow-glow hover:opacity-90 transition-opacity md:hidden"
            >
              Continue as {selected === "candidate" ? "Candidate" : "Recruiter"} →
            </button>
          </motion.div>
        )}
      </main>

      <footer className="px-8 py-5 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground border-t border-border">
        <span>© 2026 TalentPulse AI. Powered by AI.</span>
        <div className="flex gap-6 mt-2 md:mt-0 tracking-wider uppercase">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Help Center</a>
        </div>
      </footer>
    </div>
  );
};

export default RoleSelection;
