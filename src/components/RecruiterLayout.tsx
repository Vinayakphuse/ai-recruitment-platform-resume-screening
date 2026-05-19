import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, FileText, BarChart3, Settings, HelpCircle, Plus, LogOut, Workflow } from "lucide-react";
import { useRecruiter } from "@/contexts/RecruiterContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

const navItems = [
  { to: "/recruiter/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/recruiter/jobs", icon: Briefcase, label: "Jobs" },
  { to: "/recruiter/pipeline", icon: Workflow, label: "Pipeline" },
  { to: "/recruiter/resumes", icon: FileText, label: "Talent Pool" },
  { to: "/recruiter/analytics", icon: BarChart3, label: "Analytics" },
];

const RecruiterLayout = ({ children }: { children: ReactNode }) => {
  const { recruiter } = useRecruiter();
  const { signOut } = useUserProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = (recruiter?.companyName || "Co")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 flex items-center gap-3">
          {recruiter?.logoUrl ? (
            <img src={recruiter.logoUrl} alt={recruiter.companyName} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {initials}
            </div>
          )}
          <div>
            <p className="font-heading font-bold text-sm leading-tight">{recruiter?.companyName || "Your Company"}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Intelligent Matching</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition border-2 border-dashed ${
                  isActive
                    ? "bg-accent text-accent-foreground border-primary/40"
                    : "text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground"
                }`
              }>
              <Icon className="w-4 h-4" />
              {label.toUpperCase()}
            </NavLink>
          ))}

          <button
            onClick={() => navigate("/recruiter/jobs/new")}
            className="w-full mt-6 gradient-primary text-primary-foreground px-4 py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 shadow-glow hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> New Search
          </button>
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition">
            <HelpCircle className="w-4 h-4" /> Support
          </button>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="px-8 py-5 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur">
          <h1 className="font-heading font-bold text-base">Talent Intelligence</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{recruiter?.name || "Recruiter"}</span>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              {(recruiter?.name || "R").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
};

export default RecruiterLayout;
