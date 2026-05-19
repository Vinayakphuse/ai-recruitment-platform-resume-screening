import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Loader2 } from "lucide-react";
import { recruiterApi } from "@/lib/recruiterApi";

const RecruiterSignup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      await recruiterApi.signup(name, email, password);
      navigate("/recruiter/onboarding");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card rounded-2xl shadow-card p-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-heading font-bold text-center mb-1">Create Recruiter Account</h1>
        <p className="text-muted-foreground text-center text-sm mb-8">Build your talent intelligence workspace.</p>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Your Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Work Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3.5 rounded-xl font-semibold shadow-glow hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/recruiter/login" className="text-primary font-medium hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RecruiterSignup;
