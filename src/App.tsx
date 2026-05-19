import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProfileProvider, useUserProfile } from "@/contexts/UserProfileContext";
import { RecruiterProvider, useRecruiter } from "@/contexts/RecruiterContext";
import RoleSelection from "./pages/RoleSelection";
import CandidateLogin from "./pages/CandidateLogin";
import CandidateSignup from "./pages/CandidateSignup";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import JobFeed from "./pages/JobFeed";
import JobDetail from "./pages/JobDetail";
import Applications from "./pages/Applications";
import ResumeLab from "./pages/ResumeLab";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import RecruiterLogin from "./pages/recruiter/RecruiterLogin";
import RecruiterSignup from "./pages/recruiter/RecruiterSignup";
import RecruiterOnboarding from "./pages/recruiter/RecruiterOnboarding";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs";
import RecruiterTalentPool from "./pages/recruiter/RecruiterTalentPool";
import RecruiterPipeline from "./pages/recruiter/RecruiterPipeline";
import RecruiterAnalytics from "./pages/recruiter/RecruiterAnalytics";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center gradient-hero">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, authLoading } = useUserProfile();
  if (authLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Recruiter guard: must be authenticated AND have recruiter role/profile.
// Sends to onboarding if profile missing or not completed.
const RecruiterRoute = ({ children, allowOnboarding = false }: { children: React.ReactNode; allowOnboarding?: boolean }) => {
  const { isAuthenticated, authLoading } = useUserProfile();
  const { recruiter, loading } = useRecruiter();
  const location = useLocation();

  if (authLoading || loading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/recruiter/login" replace />;

  // No recruiter profile yet OR onboarding not finished → onboarding
  const needsOnboarding = !recruiter || !recruiter.onboardingCompleted;
  if (needsOnboarding && !allowOnboarding) {
    return <Navigate to="/recruiter/onboarding" replace />;
  }
  // Already onboarded but trying to view onboarding → dashboard
  if (allowOnboarding && recruiter?.onboardingCompleted && location.pathname === "/recruiter/onboarding") {
    return <Navigate to="/recruiter/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<RoleSelection />} />

    {/* Candidate */}
    <Route path="/login" element={<CandidateLogin />} />
    <Route path="/signup" element={<CandidateSignup />} />
    <Route path="/setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/jobs" element={<ProtectedRoute><JobFeed /></ProtectedRoute>} />
    <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
    <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
    <Route path="/resume-lab" element={<ProtectedRoute><ResumeLab /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

    {/* Recruiter */}
    <Route path="/recruiter/login" element={<RecruiterLogin />} />
    <Route path="/recruiter/signup" element={<RecruiterSignup />} />
    <Route path="/recruiter/onboarding" element={<RecruiterRoute allowOnboarding><RecruiterOnboarding /></RecruiterRoute>} />
    <Route path="/recruiter/dashboard" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
    <Route path="/recruiter/jobs" element={<RecruiterRoute><RecruiterJobs /></RecruiterRoute>} />
    <Route path="/recruiter/jobs/new" element={<RecruiterRoute><RecruiterJobs /></RecruiterRoute>} />
    <Route path="/recruiter/resumes" element={<RecruiterRoute><RecruiterTalentPool /></RecruiterRoute>} />
    <Route path="/recruiter/pipeline" element={<RecruiterRoute><RecruiterPipeline /></RecruiterRoute>} />
    <Route path="/recruiter/analytics" element={<RecruiterRoute><RecruiterAnalytics /></RecruiterRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UserProfileProvider>
        <RecruiterProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </RecruiterProvider>
      </UserProfileProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
