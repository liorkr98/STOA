import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const SPECIALTY_OPTIONS = ["AI & Semiconductors", "Big Tech", "EV & Clean Energy", "Macro", "Consumer Tech", "Financials", "Crypto & Web3", "Healthcare", "E-Commerce", "Options Flow"];
const PROFILE_KEY = "stakify_profile";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [uploading, setUploading] = useState(false);
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [basicMonthly, setBasicMonthly] = useState("9");
  const [basicAnnual, setBasicAnnual] = useState("79");
  const [proMonthly, setProMonthly] = useState("19");
  const [proAnnual, setProAnnual] = useState("169");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = (() => { try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; } })();
    base44.auth.me().then(user => {
      setName(saved.name || user.full_name || user.email?.split("@")[0] || "");
      setBio(saved.bio || user.bio || "");
      setAvatar(saved.avatar || user.picture || "");
      setTwitter(saved.twitter || user.twitter_handle || "");
      setLinkedin(saved.linkedin || user.linkedin_username || "");
      setWebsite(saved.website || user.website || "");
      setTagline(saved.tagline || user.tagline || "");
      setSelectedSpecialties(saved.specialties || user.specialties || []);
      setBasicMonthly(saved.basicMonthly || "9");
      setBasicAnnual(saved.basicAnnual || "79");
      setProMonthly(saved.proMonthly || "19");
      setProAnnual(saved.proAnnual || "169");
    }).finally(() => setLoading(false));
  }, []);

  const toggleSpecialty = (s) => setSelectedSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatar(file_url);
    setUploading(false);
    toast.success("Photo uploaded!");
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, bio, avatar, twitter, linkedin, website, tagline, specialties: selectedSpecialties, basicMonthly, basicAnnual, proMonthly, proAnnual }));
    try {
      await base44.auth.updateMe({
        full_name: name,
        bio,
        picture: avatar,
        tagline,
        specialties: selectedSpecialties,
        twitter_handle: twitter,
        linkedin_username: linkedin,
        website,
      });
      toast.success("Profile saved!");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Edit Profile</h1>
          <p className="text-sm text-muted-foreground">Update your public analyst profile</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</> : "Save"}</Button>
      </div>

      {/* Avatar */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-4">Photo & Branding</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {avatar
              ? <img src={avatar} alt={name} className="w-16 h-16 rounded-full border-2 border-border object-cover" />
              : <div className="w-16 h-16 rounded-full border-2 border-border bg-secondary flex items-center justify-center text-xl font-bold text-primary">{name?.[0] || "?"}</div>
            }
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div className="flex-1 space-y-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" />
            <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Tagline e.g. Senior Equity Analyst · Tech & AI" />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Bio</h3>
        <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe your background and investment philosophy..." className="resize-none h-24" />
      </div>

      {/* Specialties */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Specialties</h3>
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map(s => (
            <button key={s} onClick={() => toggleSpecialty(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selectedSpecialties.includes(s) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h3 className="font-semibold text-sm mb-3">Social Links</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">X (Twitter) Handle</label>
            <Input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="@handle" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">LinkedIn Username</label>
            <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="username" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Website</label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
          </div>
        </div>
      </div>

      {/* Subscription Pricing */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Subscription Pricing</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Basic Plan</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monthly ($/mo)</label>
                <Input value={basicMonthly} onChange={e => setBasicMonthly(e.target.value)} type="number" min="1" placeholder="9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Annual ($/yr)</label>
                <Input value={basicAnnual} onChange={e => setBasicAnnual(e.target.value)} type="number" min="1" placeholder="79" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Pro + DM Plan</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monthly ($/mo)</label>
                <Input value={proMonthly} onChange={e => setProMonthly(e.target.value)} type="number" min="1" placeholder="19" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Annual ($/yr)</label>
                <Input value={proAnnual} onChange={e => setProAnnual(e.target.value)} type="number" min="1" placeholder="169" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</> : "Save Changes"}
      </Button>
    </div>
  );
}