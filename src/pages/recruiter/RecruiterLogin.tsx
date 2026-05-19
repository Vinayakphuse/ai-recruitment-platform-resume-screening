import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Loader2 } from "lucide-react";
import { recruiterApi } from "@/lib/recruiterApi";

const RecruiterLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      await recruiterApi.login(email, password);
      // RecruiterRouteGuard will route to onboarding or dashboard based on profile state
      navigate("/recruiter/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card rounded-2xl shadow-card p-8">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-heading font-bold text-center mb-1">Recruiter Login</h1>
        <p className="text-muted-foreground text-center text-sm mb-8">Access your talent intelligence hub.</p>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Work Email</label>
            <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3.5 rounded-xl font-semibold shadow-glow hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="px-4 text-xs text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Link to="/" className="block w-full text-center py-3 rounded-xl border-2 border-dashed border-border font-semibold hover:bg-secondary transition">
          Switch Role
        </Link>

        <p className="text-center text-sm text-muted-foreground mt-6">
          New here?{" "}
          <Link to="/recruiter/signup" className="text-primary font-medium hover:underline">Create recruiter account</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RecruiterLogin;
