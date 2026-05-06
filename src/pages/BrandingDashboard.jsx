import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Palette, Upload, Type, Globe, Twitter, Linkedin,
  Save, CheckCircle2, Loader2, User, Image as ImageIcon,
  Star, TrendingUp, Award, Eye
} from "lucide-react";
import { toast } from "sonner";

const ACCENT_COLORS = [
  { label: "Blue",    value: "#3b82f6" },
  { label: "Indigo",  value: "#6366f1" },
  { label: "Purple",  value: "#a855f7" },
  { label: "Rose",    value: "#f43f5e" },
  { label: "Orange",  value: "#f97316" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Green",   value: "#22c55e" },
  { label: "Teal",    value: "#14b8a6" },
  { label: "Slate",   value: "#64748b" },
  { label: "Black",   value: "#0f172a" },
];

const FONTS = [
  { id: "inter",    label: "Inter",     style: "'Inter', sans-serif" },
  { id: "georgia",  label: "Georgia",   style: "Georgia, serif" },
  { id: "mono",     label: "Mono",      style: "'Courier New', monospace" },
  { id: "system",   label: "System UI", style: "system-ui, sans-serif" },
];

export default function BrandingDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState("identity"); // identity | style | social | preview

  // Branding fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [tagline, setTagline] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [brandFont, setBrandFont] = useState("inter");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [specialties, setSpecialties] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) {
        setDisplayName(u.full_name || u.email?.split("@")[0] || "");
        setBio(u.bio || "");
        setTagline(u.tagline || "");
        setAvatarUrl(u.picture || "");
        setBannerUrl(u.banner_url || "");
        setAccentColor(u.brand_accent || "#3b82f6");
        setBrandFont(u.brand_font || "inter");
        setTwitterHandle(u.twitter || "");
        setLinkedinUrl(u.linkedin || "");
        setWebsiteUrl(u.website || "");
        const sp = u.specialties;
        setSpecialties(Array.isArray(sp) ? sp.join(", ") : (sp || ""));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
      toast.success("Avatar uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAvatar(false); }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBannerUrl(file_url);
      toast.success("Banner uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploadingBanner(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: displayName,
        bio,
        tagline,
        picture: avatarUrl,
        banner_url: bannerUrl,
        brand_accent: accentColor,
        brand_font: brandFont,
        twitter: twitterHandle,
        linkedin: linkedinUrl,
        website: websiteUrl,
        specialties,
      });
      toast.success("Branding saved!");
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: "identity", label: "Identity",  icon: User },
    { id: "style",    label: "Style",     icon: Palette },
    { id: "social",   label: "Social",    icon: Globe },
    { id: "preview",  label: "Preview",   icon: Eye },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  const fontStyle = FONTS.find(f => f.id === brandFont)?.style || "'Inter', sans-serif";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" /> Branding Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customize how your analyst profile looks across STOA
        </p>
      </div>

      {/* Tabs + Save */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* ── Identity Tab ── */}
      {activeTab === "identity" && (
        <div className="space-y-6">
          {/* Avatar & Banner */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Banner */}
            <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5 group">
              {bannerUrl && <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />}
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all cursor-pointer">
                <span className="opacity-0 group-hover:opacity-100 flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full transition-opacity">
                  {uploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingBanner ? "Uploading..." : "Upload Banner"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              </label>
            </div>
            {/* Avatar */}
            <div className="px-5 pb-5">
              <div className="relative -mt-10 mb-4 w-fit">
                <div className="w-20 h-20 rounded-full border-4 border-card overflow-hidden bg-primary/10 group cursor-pointer">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                        {(displayName[0] || "A").toUpperCase()}
                      </div>
                  }
                </div>
                <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 hover:bg-black/30 cursor-pointer transition-all">
                  {uploadingAvatar
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Upload className="w-5 h-5 text-white opacity-0 hover:opacity-100" />
                  }
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your analyst name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tagline</label>
                  <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Macro + Tech · 3yr track record" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                    placeholder="Tell readers who you are, your approach, your background..."
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Specialties</label>
                  <Input value={specialties} onChange={e => setSpecialties(e.target.value)} placeholder="e.g. Semis, EV, Macro, AI" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Style Tab ── */}
      {activeTab === "style" && (
        <div className="space-y-6">
          {/* Accent Color */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Accent Color
            </h3>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setAccentColor(c.value)}
                  title={c.label}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    accentColor === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: c.value }}
                />
              ))}
              {/* Custom color */}
              <label className="w-9 h-9 rounded-full border-2 border-dashed border-border hover:border-primary cursor-pointer flex items-center justify-center text-muted-foreground hover:text-primary transition-all" title="Custom color">
                <Palette className="w-4 h-4" />
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Selected: <span className="font-mono font-semibold" style={{ color: accentColor }}>{accentColor}</span>
            </p>
          </div>

          {/* Font */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" /> Brand Font
            </h3>
            <div className="space-y-2">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setBrandFont(f.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                    brandFont === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <span style={{ fontFamily: f.style }} className="text-base font-medium">{f.label}</span>
                  <span style={{ fontFamily: f.style }} className="text-xs text-muted-foreground">The quick brown fox</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Social Tab ── */}
      {activeTab === "social" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Social Links
            </h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Twitter className="w-3 h-3" /> Twitter / X Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} className="pl-7" placeholder="yourhandle" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Linkedin className="w-3 h-3" /> LinkedIn URL</label>
              <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Website</label>
              <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" />
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Tab ── */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">Preview how your profile card looks to readers:</p>

          {/* Profile card preview */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-md mx-auto shadow-md">
            {/* Banner */}
            <div
              className="h-28"
              style={{
                background: bannerUrl ? `url(${bannerUrl}) center/cover` : `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`,
              }}
            />
            <div className="px-5 pb-5">
              <div className="relative -mt-8 mb-3">
                <div className="w-16 h-16 rounded-full border-4 border-card overflow-hidden bg-primary/10">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-bold text-xl" style={{ color: accentColor }}>
                        {(displayName[0] || "A").toUpperCase()}
                      </div>
                  }
                </div>
              </div>
              <h3 className="font-bold text-base" style={{ fontFamily: fontStyle }}>{displayName || "Your Name"}</h3>
              {tagline && <p className="text-xs text-muted-foreground mt-0.5">{tagline}</p>}
              {bio && <p className="text-sm text-foreground/80 mt-2 leading-relaxed line-clamp-3">{bio}</p>}
              {specialties && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {String(specialties).split(",").map(s => s.trim()).filter(Boolean).map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium border" style={{ color: accentColor, borderColor: accentColor + "44", background: accentColor + "11" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {/* Fake stats */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                {[
                  { IconComp: Star, label: "Accuracy", val: user?.accuracy_score ? `${user.accuracy_score}%` : "—" },
                  { IconComp: TrendingUp, label: "Reports", val: "—" },
                  { IconComp: Award, label: "Rank", val: "—" },
                ].map(({ IconComp, label, val }) => (
                  <div key={label} className="text-center">
                    <IconComp className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: accentColor }} />
                    <p className="text-xs font-bold">{val}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report card mini preview */}
          <div className="bg-card border border-border rounded-2xl p-5 max-w-md mx-auto shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-bold text-sm" style={{ color: accentColor }}>
                {avatarUrl ? <img src={avatarUrl} alt="a" className="w-full h-full object-cover" /> : (displayName[0] || "A").toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ fontFamily: fontStyle }}>{displayName || "Your Name"}</p>
                <p className="text-[10px] text-muted-foreground">{tagline || "Analyst on STOA"}</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: accentColor + "22", color: accentColor }}>Long</span>
            </div>
            <p className="text-sm font-semibold" style={{ fontFamily: fontStyle }}>NVDA — Why This Dip Is a Gift</p>
            <p className="text-xs text-muted-foreground mt-1">AI capex cycle remains intact. NVDA's moat is deepening with each software layer...</p>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
              <span>❤️ 47</span>
              <span>💬 12</span>
              <span className="ml-auto font-semibold" style={{ color: accentColor }}>Premium · $4.99</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}