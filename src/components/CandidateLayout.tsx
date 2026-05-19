import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Search, FileText, CheckSquare, User, HelpCircle, LogOut, Settings, Sparkles } from "lucide-react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import NotificationsBell from "./NotificationsBell";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Find Jobs", icon: Search, path: "/jobs" },
  { label: "Resume Analysis", icon: Sparkles, path: "/resume-lab" },
  { label: "Tracker", icon: CheckSquare, path: "/applications" },
  { label: "Profile", icon: User, path: "/profile" },
];

const topTabs = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Job Feed", path: "/jobs" },
  { label: "My Applications", path: "/applications" },
  { label: "Resume Lab", path: "/resume-lab" },
];

const CandidateLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useUserProfile();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card p-4 justify-between">
        <div>
          <div className="mb-8">
            <span className="text-lg font-heading font-bold text-primary">TalentPulse</span>
            <p className="text-xs text-muted-foreground">AI Career Curator</p>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-2">
          <div className="p-3 rounded-xl gradient-primary text-primary-foreground text-center mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5">Pro Access</p>
            <p className="text-xs opacity-80">Unlock advanced AI</p>
            <button className="mt-2 px-4 py-1.5 rounded-lg bg-card/20 text-xs font-semibold hover:bg-card/30 transition">Upgrade to Pro</button>
          </div>
          <button className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition w-full">
            <HelpCircle className="w-4 h-4" /> Help Center
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition w-full">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Nav */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-lg font-heading font-bold text-primary">TalentPulse AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {topTabs.map(tab => (
              <Link key={tab.path} to={tab.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === tab.path
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                }`}>
                {tab.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <button className="p-2 rounded-lg hover:bg-secondary transition"><Settings className="w-5 h-5 text-muted-foreground" /></button>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {profile?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CandidateLayout;
