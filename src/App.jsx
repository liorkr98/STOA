import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { Toaster as SonnerToaster } from 'sonner';

// ── Critical paths: load eagerly ───────────────────────────────────────────
// These are hit by every authenticated user on every session, so paying
// the bundle cost upfront beats showing a loading spinner.
import HomePageDashboard from '@/pages/HomePageDashboard';
import HomeFeed          from '@/pages/HomeFeed';
import ReportView        from '@/pages/ReportView';
import AnalystProfilePage from '@/pages/AnalystProfilePage';
import StocksPage        from '@/pages/StocksPage';
import StockPage         from '@/pages/StockPage';
import LandingPage       from '@/pages/LandingPage';
import SignIn            from '@/pages/SignIn';

// ── Lazy-loaded: code-split into separate bundles ──────────────────────────
// Each becomes its own .js file fetched only when the route is hit.
// Cuts the initial bundle by ~40-60% which speeds up first paint dramatically.
const ReportEditor          = lazy(() => import('@/pages/ReportEditor'));
const AnalystDashboard      = lazy(() => import('@/pages/AnalystDashboard'));
const PaymentPage           = lazy(() => import('@/pages/PaymentPage'));
const EditProfilePage       = lazy(() => import('@/pages/EditProfilePage'));
const DMPage                = lazy(() => import('@/pages/DMPage'));
const PredictionSummaryPage = lazy(() => import('@/pages/PredictionSummaryPage'));
const AnalyticsPage         = lazy(() => import('@/pages/AnalyticsPage'));
const AboutPage             = lazy(() => import('@/pages/AboutPage'));
const HowItWorksPage        = lazy(() => import('@/pages/HowItWorksPage'));
const FeaturesPage          = lazy(() => import('@/pages/FeaturesPage'));
const PricingPage           = lazy(() => import('@/pages/PricingPage'));
const NewsroomPage          = lazy(() => import('@/pages/NewsroomPage'));
const CalculationsPage      = lazy(() => import('@/pages/CalculationsPage'));
const TermsPage             = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage           = lazy(() => import('@/pages/PrivacyPage'));
const CookiePolicyPage      = lazy(() => import('@/pages/CookiePolicyPage'));
const AccessibilityPage     = lazy(() => import('@/pages/AccessibilityPage'));
const WalletPage            = lazy(() => import('@/pages/WalletPage'));
const BrandingDashboard     = lazy(() => import('@/pages/BrandingDashboard'));
const LeaderboardPage       = lazy(() => import('@/pages/LeaderboardPage'));
const SubscribersPage       = lazy(() => import('@/pages/SubscribersPage'));
const ScoringPage           = lazy(() => import('@/pages/ScoringPage'));
const AdminUsersPage        = lazy(() => import('@/pages/AdminUsersPage'));
const CreatorAnalyticsPage  = lazy(() => import('@/pages/CreatorAnalyticsPage'));
const SavedReportsPage      = lazy(() => import('@/pages/SavedReportsPage'));
const InboxPage             = lazy(() => import('@/pages/InboxPage'));
const BecomeAnalystPage     = lazy(() => import('@/pages/BecomeAnalystPage'));

// Tiny spinner shown while a route's bundle is fetching
const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
  </div>
);

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
  const path      = window.location.pathname;
  const isRoot    = path === "/";
  // /signin must render the in-app SignIn page even for unauthenticated
  // users — otherwise the auth_required branch below shunts them through
  // navigateToLogin() (the host-page redirect that 403'd), which is why
  // the landing page's "Log In" button appeared to do nothing.
  const isSignIn  = path === "/signin";

  if (isLoading) {
    if (isRoot) return <LandingPage />;
    if (isSignIn) return <SignIn />;
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') {
      if (isRoot)   return <LandingPage />;
      if (isSignIn) return <SignIn />;
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App