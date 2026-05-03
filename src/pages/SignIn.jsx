import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StoaLogo from "@/components/StoaLogo";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password.");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-center px-12 w-5/12 bg-primary text-white">
        <StoaLogo size={32} textSize="text-2xl" light className="mb-8" />
        <h2 className="text-3xl font-bold leading-tight mb-4">
          Transparent finance.<br />Verified predictions.
        </h2>
        <p className="text-primary-foreground/80 text-sm mb-8">
          Follow top analysts, track their live predictions, and make smarter investment decisions backed by real data.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "87.5%", label: "Top analyst accuracy" },
            { value: "+34.2%", label: "Best yearly yield" },
            { value: "12,400+", label: "Active followers" },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-primary-foreground/70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><StoaLogo /></div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

          <Button onClick={handleGoogle} variant="outline" className="w-full gap-2 mb-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M15.68 8.182c0-.57-.051-1.12-.146-1.645H8v3.11h4.305a3.68 3.68 0 01-1.597 2.415v2.008h2.586c1.513-1.393 2.386-3.445 2.386-5.888z" fill="#4285F4"/>
              <path d="M8 16c2.16 0 3.97-.717 5.294-1.93l-2.586-2.008c-.717.48-1.633.764-2.708.764-2.083 0-3.847-1.407-4.477-3.297H.847v2.074A8 8 0 008 16z" fill="#34A853"/>
              <path d="M3.523 9.529A4.8 4.8 0 013.272 8c0-.531.091-1.047.251-1.529V4.397H.847A8 8 0 000 8c0 1.291.309 2.513.847 3.603l2.676-2.074z" fill="#FBBC05"/>
              <path d="M8 3.18c1.173 0 2.224.403 3.052 1.196l2.288-2.288C11.965.79 10.157 0 8 0A8 8 0 00.847 4.397L3.523 6.47C4.153 4.58 5.917 3.18 8 3.18z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or sign in with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-loss bg-loss/10 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-4">
            Don't have an account?{" "}
            <Link to="/" className="text-primary hover:underline">Browse as guest</Link>
          </p>
        </div>
      </div>
    </div>
  );
}