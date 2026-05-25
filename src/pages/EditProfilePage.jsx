import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Star, ArrowUp, ArrowDown, Trash2, Plus, X, Eye, Save,
  Twitter, Linkedin, Send, BookOpen, Link2, GripVertical, Loader2,
  Bold, Italic,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

// ── ProfilePage edit experience (rebuild for v2.1) ──────────────────
//
// Replaces the previous redirect-stub. Analysts now get a dedicated edit
// surface with the full storefront vocabulary: banner image upload, rich
// bio, reorderable About sections, featured reports, social links, tags,
// and a preview-as-visitor mode.
//
// All data persists on the User entity via base44.auth.updateMyUserData.
// Custom-shaped fields (about_sections, featured_reports, social_links)
// are serialised into a single `profile_config` JSON string to avoid
// schema migration on the Base44 dashboard.

const DEFAULT_CONFIG = {
  banner_image_url: null,
  bio_rich: "",
  about_sections: [],         // [{ id, title, body }]
  featured_report_ids: [],    // [reportId, …] max 3
  social: { twitter: "", linkedin: "", telegram: "", substack: "", website: "" },
  specialties: [],            // [tag, …]
};

function parseConfig(user) {
  if (!user) return DEFAULT_CONFIG;
  try {
    const raw = user.profile_config_json
      ? JSON.parse(user.profile_config_json)
      : (user.profile_config || {});
    return { ...DEFAULT_CONFIG, ...raw,
      social: { ...DEFAULT_CONFIG.social, ...(raw.social || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Rich text textarea — surfaces bold/italic markdown shortcuts so the
// analyst can write **bold** and *italic* without learning syntax. The
// public profile renders the same markdown via a tiny regex pass. ─────
function RichTextarea({ value, onChange, placeholder, minRows = 5 }) {
  const ref = useRef(null);
  const wrap = (marker) => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const before = value.slice(0, s);
    const sel = value.slice(s, e) || "text";
    const after = value.slice(e);
    const next = `${before}${marker}${sel}${marker}${after}`;
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(before.length + marker.length, before.length + marker.length + sel.length);
    }, 0);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => wrap("**")} className="btn btn-ghost btn-sm" style={{ height: 26, padding: "0 8px", fontSize: 11 }}>
          <Bold size={11} strokeWidth={2}/> Bold
        </button>
        <button type="button" onClick={() => wrap("*")} className="btn btn-ghost btn-sm" style={{ height: 26, padding: "0 8px", fontSize: 11 }}>
          <Italic size={11} strokeWidth={2}/> Italic
        </button>
        <span className="t-meta" style={{ fontSize: 10.5, alignSelf: "center", marginLeft: 6 }}>
          Use [text](https://link) for links.
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={minRows}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "12px 14px",
          border: "0.5px solid var(--border-strong)",
          borderRadius: 6,
          background: "var(--bg-elev)",
          fontFamily: "var(--f-sans)",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--text-body)",
          resize: "vertical",
        }}
      />
    </div>
  );
}

// Render the same markdown (bold/italic/links) for the preview.
function renderRich(md) {
  if (!md) return "";
  let s = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" style="color:var(--primary-blue);text-decoration:underline">$1</a>');
  return s.replace(/\n/g, "<br/>");
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [fullName, setFullName] = useState("");
  const [tagSpec, setTagSpec] = useState("");
  const [myReports, setMyReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const bannerInputRef = useRef(null);

  // Hydrate from current user
  useEffect(() => {
    if (!user) return;
    setConfig(parseConfig(user));
    setFullName(user.full_name || "");
  }, [user]);

  // Author's own reports — used for the featured-reports picker
  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Report
      .filter({ created_by: user.email, status: "published" }, "-created_date", 60)
      .then((r) => setMyReports(r || []))
      .catch(() => setMyReports([]));
  }, [user?.email]);

  const featuredReports = useMemo(
    () => config.featured_report_ids
      .map((id) => myReports.find((r) => r.id === id))
      .filter(Boolean),
    [config.featured_report_ids, myReports]
  );

  if (!user) {
    return (
      <div className="page" style={{ padding: 80, textAlign: "center" }}>
        <span className="t-meta">Sign in to edit your profile.</span>
      </div>
    );
  }

  const set = (k, v) => setConfig((c) => ({ ...c, [k]: v }));
  const setSocial = (k, v) => setConfig((c) => ({ ...c, social: { ...c.social, [k]: v } }));

  const uploadBanner = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Banner must be under 5MB."); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("banner_image_url", file_url);
      toast.success("Banner uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // About sections — full reorder controls
  const addSection = () => {
    set("about_sections", [...config.about_sections, { id: uid(), title: "New section", body: "" }]);
  };
  const updateSection = (id, patch) => {
    set("about_sections", config.about_sections.map((s) => s.id === id ? { ...s, ...patch } : s));
  };
  const moveSection = (id, dir) => {
    const arr = [...config.about_sections];
    const i = arr.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("about_sections", arr);
  };
  const removeSection = (id) => set("about_sections", config.about_sections.filter((s) => s.id !== id));

  // Featured reports — pinned up to 3
  const toggleFeatured = (id) => {
    const cur = config.featured_report_ids;
    if (cur.includes(id)) set("featured_report_ids", cur.filter((x) => x !== id));
    else if (cur.length < 3) set("featured_report_ids", [...cur, id]);
    else toast.error("You can pin at most 3 featured reports.");
  };

  // Specialties / tags
  const addSpecialty = () => {
    const v = tagSpec.trim();
    if (!v) return;
    if (config.specialties.includes(v)) { setTagSpec(""); return; }
    set("specialties", [...config.specialties, v]);
    setTagSpec("");
  };
  const removeSpecialty = (t) => set("specialties", config.specialties.filter((x) => x !== t));

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMyUserData({
        full_name: fullName,
        profile_config_json: JSON.stringify(config),
      });
      toast.success("Profile saved.");
      if (refreshUser) await refreshUser();
    } catch (e) {
      toast.error(e?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <section style={{ padding: "20px 0 16px", borderBottom: "0.5px solid var(--border-rgba)" }}>
        <div className="shell" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackButton fallback={`/analyst`}/>
          <div style={{ flex: 1 }}>
            <h1 className="t-display" style={{ fontSize: 22, margin: 0 }}>Edit profile</h1>
            <p className="t-meta" style={{ fontSize: 12, margin: "2px 0 0" }}>
              Your storefront — banner, bio, featured reports, social links.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setPreview((p) => !p)}>
            <Eye size={12} strokeWidth={1.7}/> {preview ? "Edit" : "Preview"}
          </button>
          <button className="btn btn-gold btn-sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12} strokeWidth={1.7}/>}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </section>

      <div className="shell" style={{ padding: "32px 0 96px" }}>
        {preview ? <PreviewPanel config={config} fullName={fullName} reports={featuredReports}/> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 22, maxWidth: 880, margin: "0 auto" }}>

            {/* Banner */}
            <div className="surface" style={{ padding: 22 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Banner</div>
              <div
                style={{
                  height: 160,
                  borderRadius: 8,
                  background: config.banner_image_url
                    ? `url(${config.banner_image_url}) center/cover`
                    : "linear-gradient(135deg, var(--deepest-navy), var(--primary-blue))",
                  border: "0.5px solid var(--border-rgba)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadBanner(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 10,
                }}>
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="btn btn-gold btn-sm"
                    disabled={uploading}
                    style={{ background: "rgba(212,175,55,0.92)" }}
                  >
                    <Camera size={12} strokeWidth={1.7}/>
                    {uploading ? "Uploading…" : config.banner_image_url ? "Replace banner" : "Upload banner"}
                  </button>
                  {config.banner_image_url && (
                    <button
                      onClick={() => set("banner_image_url", null)}
                      className="btn btn-ghost btn-sm"
                      style={{ background: "rgba(0,0,0,0.4)", color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}
                    >
                      <Trash2 size={11}/> Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="t-meta" style={{ fontSize: 11, marginTop: 10 }}>
                JPG / PNG, recommended 1600×400, max 5MB.
              </p>
            </div>

            {/* Name + bio */}
            <div className="surface" style={{ padding: 22 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Identity</div>
              <label className="t-meta" style={{ fontSize: 11, display: "block", marginBottom: 6 }}>Display name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                style={{
                  width: "100%", height: 38, padding: "0 12px",
                  border: "0.5px solid var(--border-strong)", borderRadius: 6,
                  background: "var(--bg-elev)", fontSize: 14, color: "var(--text)",
                  fontFamily: "var(--f-sans)", marginBottom: 14,
                }}
              />
              <label className="t-meta" style={{ fontSize: 11, display: "block", marginBottom: 6 }}>Bio</label>
              <RichTextarea
                value={config.bio_rich}
                onChange={(v) => set("bio_rich", v)}
                placeholder="A few lines about your investment philosophy, edge, and coverage."
                minRows={5}
              />
            </div>

            {/* About sections (reorderable) */}
            <div className="surface" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <div className="t-eyebrow">Custom About sections</div>
                <div style={{ flex: 1 }}/>
                <button className="btn btn-ghost btn-sm" onClick={addSection}>
                  <Plus size={11} strokeWidth={1.8}/> Add section
                </button>
              </div>
              {config.about_sections.length === 0 && (
                <p className="t-meta" style={{ fontSize: 12 }}>
                  Add custom sections to share your process, watchlist, philosophy, or anything that helps subscribers know what they're getting.
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {config.about_sections.map((s, i) => (
                  <div key={s.id} style={{
                    border: "0.5px solid var(--border-rgba)",
                    borderRadius: 8, padding: 14, background: "var(--bg-elev)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <GripVertical size={12} style={{ color: "var(--text-meta)" }}/>
                      <input
                        value={s.title}
                        onChange={(e) => updateSection(s.id, { title: e.target.value })}
                        placeholder="Section heading"
                        style={{
                          flex: 1, height: 30, padding: "0 8px",
                          border: "0.5px solid var(--border-rgba)", borderRadius: 4,
                          background: "var(--bg)", fontSize: 13.5, color: "var(--text)",
                          fontFamily: "var(--f-sans)", fontWeight: 500,
                        }}
                      />
                      <button onClick={() => moveSection(s.id, -1)} className="btn btn-ghost btn-sm" disabled={i === 0} style={{ width: 28, padding: 0 }}>
                        <ArrowUp size={12}/>
                      </button>
                      <button onClick={() => moveSection(s.id, +1)} className="btn btn-ghost btn-sm" disabled={i === config.about_sections.length - 1} style={{ width: 28, padding: 0 }}>
                        <ArrowDown size={12}/>
                      </button>
                      <button onClick={() => removeSection(s.id)} className="btn btn-ghost btn-sm" style={{ width: 28, padding: 0, color: "var(--velvet-red)" }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                    <textarea
                      value={s.body}
                      onChange={(e) => updateSection(s.id, { body: e.target.value })}
                      rows={4}
                      placeholder="Section body — markdown supported."
                      style={{
                        width: "100%", padding: "10px 12px",
                        border: "0.5px solid var(--border-rgba)", borderRadius: 4,
                        background: "var(--bg)",
                        fontFamily: "var(--f-sans)", fontSize: 13,
                        color: "var(--text-body)", resize: "vertical", lineHeight: 1.55,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Featured reports */}
            <div className="surface" style={{ padding: 22 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Featured reports · pin up to 3</div>
              {myReports.length === 0 ? (
                <p className="t-meta" style={{ fontSize: 12 }}>You don't have any published reports yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {myReports.slice(0, 30).map((r) => {
                    const picked = config.featured_report_ids.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggleFeatured(r.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px",
                          border: "0.5px solid",
                          borderColor: picked ? "var(--gold-hex)" : "var(--border-rgba)",
                          background: picked ? "rgba(212,175,55,0.06)" : "var(--bg-elev)",
                          borderRadius: 6,
                          textAlign: "left", cursor: "pointer",
                        }}
                      >
                        <Star
                          size={13} strokeWidth={1.7}
                          style={{ color: picked ? "var(--gold-hex)" : "var(--text-meta)", fill: picked ? "var(--gold-hex)" : "transparent" }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--f-serif)" }}>{r.title}</div>
                          <div className="t-meta" style={{ fontSize: 11, marginTop: 2 }}>
                            {r.published_at ? new Date(r.published_at).toLocaleDateString() : ""}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Social links */}
            <div className="surface" style={{ padding: 22 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Social links</div>
              {[
                { k: "twitter", Icon: Twitter, label: "X / Twitter", placeholder: "https://x.com/handle" },
                { k: "linkedin", Icon: Linkedin, label: "LinkedIn", placeholder: "https://linkedin.com/in/handle" },
                { k: "telegram", Icon: Send, label: "Telegram", placeholder: "https://t.me/handle" },
                { k: "substack", Icon: BookOpen, label: "Substack", placeholder: "https://you.substack.com" },
                { k: "website", Icon: Link2, label: "Personal site", placeholder: "https://example.com" },
              ].map(({ k, Icon, label, placeholder }) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Icon size={14} strokeWidth={1.6} style={{ color: "var(--text-meta)", flexShrink: 0 }}/>
                  <span className="t-meta" style={{ width: 100, fontSize: 12 }}>{label}</span>
                  <input
                    value={config.social[k] || ""}
                    onChange={(e) => setSocial(k, e.target.value)}
                    placeholder={placeholder}
                    style={{
                      flex: 1, height: 34, padding: "0 10px",
                      border: "0.5px solid var(--border-strong)", borderRadius: 6,
                      background: "var(--bg-elev)", fontSize: 12.5,
                      fontFamily: "var(--f-sans)", color: "var(--text)",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Specialties / tags */}
            <div className="surface" style={{ padding: 22 }}>
              <div className="t-eyebrow" style={{ marginBottom: 10 }}>Specialties</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  value={tagSpec}
                  onChange={(e) => setTagSpec(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                  placeholder="Semis, Macro, AI, Small Caps, ETFs…"
                  style={{
                    flex: 1, height: 34, padding: "0 10px",
                    border: "0.5px solid var(--border-strong)", borderRadius: 6,
                    background: "var(--bg-elev)", fontSize: 13,
                    fontFamily: "var(--f-sans)", color: "var(--text)",
                  }}
                />
                <button className="btn btn-ghost btn-sm" onClick={addSpecialty}>Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {config.specialties.map((t) => (
                  <span key={t} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {t}
                    <button onClick={() => removeSpecialty(t)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "currentColor", padding: 0 }}>
                      <X size={10} strokeWidth={2}/>
                    </button>
                  </span>
                ))}
                {config.specialties.length === 0 && (
                  <span className="t-meta" style={{ fontSize: 11 }}>No tags yet — these show up on your profile and help subscribers find you.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview panel — what a visitor sees ──────────────────────────────
function PreviewPanel({ config, fullName, reports }) {
  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div className="receipt" style={{ marginBottom: 14, color: "var(--gold-hex)" }}>
        PREVIEW · WHAT VISITORS SEE
      </div>
      <div
        style={{
          height: 200,
          borderRadius: 10,
          background: config.banner_image_url
            ? `url(${config.banner_image_url}) center/cover`
            : "linear-gradient(135deg, var(--deepest-navy), var(--primary-blue))",
          marginBottom: 22,
        }}
      />
      <h2 className="t-display" style={{ fontSize: 34, margin: "0 0 14px" }}>{fullName || "Your name"}</h2>
      {config.specialties.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
          {config.specialties.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
      <div
        className="t-body"
        style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-body)", marginBottom: 28 }}
        dangerouslySetInnerHTML={{ __html: renderRich(config.bio_rich) }}
      />

      {reports.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Featured reports</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(reports.length, 3)}, 1fr)`, gap: 12 }}>
            {reports.map((r) => (
              <div key={r.id} className="surface" style={{ padding: 16 }}>
                <Star size={11} style={{ color: "var(--gold-hex)", fill: "var(--gold-hex)" }}/>
                <div className="t-title" style={{ fontSize: 15, margin: "8px 0 4px" }}>{r.title}</div>
                <div className="t-meta" style={{ fontSize: 11 }}>
                  {r.published_at ? new Date(r.published_at).toLocaleDateString() : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {config.about_sections.map((s) => (
        <div key={s.id} style={{ marginBottom: 28 }}>
          <h3 className="t-title" style={{ fontSize: 19, margin: "0 0 8px" }}>{s.title}</h3>
          <div
            style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-body)" }}
            dangerouslySetInnerHTML={{ __html: renderRich(s.body) }}
          />
        </div>
      ))}

      {Object.values(config.social).some(Boolean) && (
        <div style={{ display: "flex", gap: 14, marginTop: 22, paddingTop: 18, borderTop: "0.5px solid var(--border-rgba)" }}>
          {Object.entries(config.social).filter(([, v]) => v).map(([k, v]) => (
            <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="t-meta" style={{ fontSize: 12, color: "var(--primary-blue)" }}>
              {k}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
