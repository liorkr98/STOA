import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster as SonnerToaster } from 'sonner';

// Pages
import HomeFeed from '@/pages/HomeFeed';
import HomePageDashboard from '@/pages/HomePageDashboard';
import ReportView from '@/pages/ReportView';
import ReportEditor from '@/pages/ReportEditor';
import AnalystDashboard from '@/pages/AnalystDashboard';
import AnalystProfilePage from '@/pages/AnalystProfilePage';

import StockPage from '@/pages/StockPage';
import PaymentPage from '@/pages/PaymentPage';
import EditProfilePage from '@/pages/EditProfilePage';
import DMPage from '@/pages/DMPage';
import PredictionSummaryPage from '@/pages/PredictionSummaryPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import AboutPage from '@/pages/AboutPage';
import HowItWorksPage from '@/pages/HowItWorksPage';
import FeaturesPage from '@/pages/FeaturesPage';
import PricingPage from '@/pages/PricingPage';
import NewsroomPage from '@/pages/NewsroomPage';
import CalculationsPage from '@/pages/CalculationsPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import CookiePolicyPage from '@/pages/CookiePolicyPage';
import AccessibilityPage from '@/pages/AccessibilityPage';
import SignIn from '@/pages/SignIn';
import LandingPage from '@/pages/LandingPage';
import WalletPage from '@/pages/WalletPage';
import BrandingDashboard from '@/pages/BrandingDashboard';
import LeaderboardPage from '@/pages/LeaderboardPage';
import StocksPage from '@/pages/StocksPage';
import SubscribersPage from '@/pages/SubscribersPage';
import ScoringPage from '@/pages/ScoringPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import CreatorAnalyticsPage from '@/pages/CreatorAnalyticsPage';
import SavedReportsPage from '@/pages/SavedReportsPage';
import InboxPage from '@/pages/InboxPage';
import BecomeAnalystPage from '@/pages/BecomeAnalystPage';

// Guard: send investors to the upgrade flow before they can write
function EditorRoute() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <SignIn />;
  if (user && user.role !== "analyst" && user.role !== "admin") {
    return <Navigate to="/become-analyst" replace />;
  }
  return <ReportEditor />;
}


// Root route: landing for logged-out, dashboard for logged-in
function RootRoute() {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const isLoading = isLoadingAuth || isLoadingPublicSettings;

  if (isLoading) return <LandingPage />;
  if (!isAuthenticated) return <LandingPage />;
  return <HomePageDashboard />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();
  const isLoading = isLoadingPublicSettings || isLoadingAuth;
  const isRoot = window.location.pathname === "/";

  if (isLoading) {
    if (isRoot) return <LandingPage />;
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') {
      if (isRoot) return <LandingPage />;
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />

      {/* Routes with AppLayout */}
      <Route element={<AppLayout />}>
        {/* Root — handles landing/feed split */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/feed" element={<HomeFeed />} />
        <Route path="/report" element={<ReportView />} />
        <Route path="/analyst/:username" element={<AnalystProfilePage />} />
        <Route path="/analyst" element={<AnalystProfilePage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/stock/:ticker" element={<StockPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/newsroom" element={<NewsroomPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/calculations" element={<CalculationsPage />} />
        <Route path="/scoring" element={<ScoringPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />

        {/* Auth-required routes */}
        <Route path="/editor" element={<EditorRoute />} />
        <Route path="/become-analyst" element={isAuthenticated ? <BecomeAnalystPage /> : <SignIn />} />
        <Route path="/dashboard" element={isAuthenticated ? <AnalystDashboard /> : <SignIn />} />
        <Route path="/edit-profile" element={isAuthenticated ? <EditProfilePage /> : <SignIn />} />
        <Route path="/dm" element={isAuthenticated ? <DMPage /> : <SignIn />} />
        <Route path="/inbox" element={isAuthenticated ? <InboxPage /> : <SignIn />} />
        <Route path="/predictions" element={isAuthenticated ? <PredictionSummaryPage /> : <SignIn />} />
        <Route path="/analytics" element={isAuthenticated ? <AnalyticsPage /> : <SignIn />} />
        <Route path="/wallet" element={isAuthenticated ? <WalletPage /> : <SignIn />} />
        <Route path="/branding" element={isAuthenticated ? <BrandingDashboard /> : <SignIn />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/subscribers" element={isAuthenticated ? <SubscribersPage /> : <SignIn />} />
        <Route path="/admin/users" element={isAuthenticated ? <AdminUsersPage /> : <SignIn />} />
        <Route path="/analytics/creator" element={isAuthenticated ? <CreatorAnalyticsPage /> : <SignIn />} />
        <Route path="/creator-analytics" element={isAuthenticated ? <CreatorAnalyticsPage /> : <SignIn />} />
        <Route path="/saved" element={isAuthenticated ? <SavedReportsPage /> : <SignIn />} />
        <Route path="/stocks" element={<StocksPage />} />
        <Route path="/pay" element={<PaymentPage />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App