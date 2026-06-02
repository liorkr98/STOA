import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Shield, Users, FileText, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}
function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return format(new Date(dateStr), "MMM d, yyyy");
}

const ROLE_PILL = {
  admin:           "pill-accent",
  analyst:         "pill-primary",
  pending_analyst: "pill",
  user:            "pill",
};

const COLUMNS = [
  { key: "full_name",       label: "User" },
  { key: "role",            label: "Role" },
  { key: "accuracy_score",  label: "Accuracy" },
  { key: "last_seen",       label: "Last Seen" },
  { key: "created_date",    label: "Joined" },
  { key: "report_count",    label: "Reports" },
  { key: "followers_count", label: "Followers" },
];

// ── Approvals Tab ──────────────────────────────────────────────────────────────
function ApprovalsTab({ users, onApprove, onReject }) {
  const pending = users.filter(u => u.role === "pending_analyst");

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-gain/10 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-gain" />
        </div>
        <p className="text-base font-semibold">All caught up</p>
        <p className="text-sm text-muted-foreground">No pending researcher applications</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map(u => {
        const cfg = (() => {
          try { return JSON.parse(u.profile_config || "{}"); } catch { return {}; }
        })();
        const appliedAt = cfg.applied_at ? format(new Date(cfg.applied_at), "MMM d, yyyy 'at' h:mm a") : timeAgo(u.created_date);

        return (
          <div key={u.id} className="bg-card border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4">
            {/* Avatar + identity */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-border flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
                {u.picture
                  ? <img src={u.picture} alt={u.full_name} className="w-full h-full object-cover" />
                  : (u.full_name || u.email || "U")[0].toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{u.full_name || "—"}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    PENDING REVIEW
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Applied {appliedAt}</p>

                {u.tagline && (
                  <p className="text-sm font-medium text-foreground mt-2 italic">"{u.tagline}"</p>
                )}
                {u.bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{u.bio}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {cfg.investment_style && (
                    <span className="pill text-[10px]">Style: {cfg.investment_style}</span>
                  )}
                  {(u.specialties || []).map(s => (
                    <span key={s} className="pill text-[10px]">{s}</span>
                  ))}
                </div>

                {cfg.methodology && (
                  <details className="mt-2">
                    <summary className="text-xs text-primary cursor-pointer hover:underline">View methodology</summary>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cfg.methodology}</p>
                  </details>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex sm:flex-col gap-2 sm:items-end justify-end">
              <Button
                size="sm"
                onClick={() => onApprove(u)}
                className="gap-1.5 bg-gain text-white hover:bg-gain/90"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(u)}
                className="gap-1.5 text-loss border-loss/30 hover:bg-loss/10"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers]             = useState([]);
  const [reportCounts, setReportCounts] = useState({});
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState("created_date");
  const [sortDir, setSortDir]         = useState("desc");
  const [activeTab, setActiveTab]     = useState("users");
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role !== "admin") { navigate("/dashboard"); return; }

    Promise.all([
      base44.entities.User.list("-created_date", 500),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 1000),
    ]).then(([allUsers, allReports]) => {
      setUsers(allUsers || []);
      const counts = {};
      (allReports || []).forEach(r => {
        if (r.created_by) counts[r.created_by] = (counts[r.created_by] || 0) + 1;
      });
      setReportCounts(counts);
    }).finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  // ── Approval actions ──
  const handleApprove = async (applicant) => {
    if (actionLoading[applicant.id]) return;
    setActionLoading(p => ({ ...p, [applicant.id]: true }));
    try {
      await base44.entities.User.update(applicant.id, { role: "analyst" });
      // Notify the applicant
      await base44.entities.Notification.create({
        user_email: applicant.email,
        type:       "follow",
        title:      "🎉 You've been approved as a researcher!",
        body:       "Welcome to STOA's creator program. You can now publish research reports.",
        link:       "/editor",
      }).catch(() => {});
      setUsers(prev => prev.map(u => u.id === applicant.id ? { ...u, role: "analyst" } : u));
      toast.success(`${applicant.full_name || applicant.email} approved as researcher`);
    } catch {
      toast.error("Failed to approve — try again");
    } finally {
      setActionLoading(p => ({ ...p, [applicant.id]: false }));
    }
  };

  const handleReject = async (applicant) => {
    if (actionLoading[applicant.id]) return;
    setActionLoading(p => ({ ...p, [applicant.id]: true }));
    try {
      await base44.entities.User.update(applicant.id, { role: "user" });
      await base44.entities.Notification.create({
        user_email: applicant.email,
        type:       "report",
        title:      "Researcher application update",
        body:       "Your application wasn't approved at this time. You're welcome to reapply once you have more experience.",
        link:       "/feed",
      }).catch(() => {});
      setUsers(prev => prev.map(u => u.id === applicant.id ? { ...u, role: "user" } : u));
      toast.success("Application rejected");
    } catch {
      toast.error("Failed to reject — try again");
    } finally {
      setActionLoading(p => ({ ...p, [applicant.id]: false }));
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const enriched = useMemo(() => users.map(u => ({
    ...u, report_count: reportCounts[u.email] || 0,
  })), [users, reportCounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(u =>
      !q || (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortKey] ?? "";
      let bVal = b[sortKey] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const exportCSV = () => {
    const headers = ["Name","Email","Role","Accuracy","Last Seen","Joined","Reports","Followers"];
    const rows = sorted.map(u => [u.full_name||"",u.email||"",u.role||"user",u.accuracy_score||0,u.last_seen||"",u.created_date||"",u.report_count||0,u.followers_count||0]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="users.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const pendingCount = users.filter(u => u.role === "pending_analyst").length;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Admin — Users</h1>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
            {users.length} users
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 w-64 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Users",     value: users.length,                                                      icon: Users,       color: "text-primary" },
          { label: "Researchers",     value: users.filter(u => u.role === "analyst" || u.role === "admin").length, icon: FileText, color: "text-gain" },
          { label: "Pending Review",  value: pendingCount,                                                       icon: Clock,       color: "text-amber-600" },
          { label: "Total Reports",   value: Object.values(reportCounts).reduce((a,b)=>a+b,0),                  icon: FileText,    color: "text-primary" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("w-4 h-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {[
          { id: "users",     label: "All Users",    count: users.length },
          { id: "approvals", label: "Approvals",    count: pendingCount, highlight: pendingCount > 0 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab.highlight ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "approvals" ? (
        <ApprovalsTab users={users} onApprove={handleApprove} onReject={handleReject} />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => (
                  <tr key={u.id} className={cn(
                    "border-b border-border/50 hover:bg-secondary/30 transition-colors",
                    i % 2 === 0 ? "" : "bg-secondary/10",
                    u.role === "pending_analyst" && "bg-amber-50/50"
                  )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0 overflow-hidden">
                          {u.picture
                            ? <img src={u.picture} alt={u.full_name} className="w-full h-full object-cover" />
                            : (u.full_name || u.email || "U")[0].toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[140px]">{u.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[140px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className={cn("capitalize", ROLE_PILL[u.role] || ROLE_PILL.user)}>
                          {u.role === "pending_analyst" ? "Pending" : (u.role || "user")}
                        </span>
                        {u.role === "pending_analyst" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApprove(u)}
                              disabled={actionLoading[u.id]}
                              className="text-[10px] font-bold text-gain bg-gain/10 hover:bg-gain/20 px-1.5 py-0.5 rounded border border-gain/20 transition-colors"
                            >
                              {actionLoading[u.id] ? "…" : "✓"}
                            </button>
                            <button
                              onClick={() => handleReject(u)}
                              disabled={actionLoading[u.id]}
                              className="text-[10px] font-bold text-loss bg-loss/10 hover:bg-loss/20 px-1.5 py-0.5 rounded border border-loss/20 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.accuracy_score > 0
                        ? <AccuracyTierBadge accuracy={u.accuracy_score} />
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(u.last_seen)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.created_date)}</td>
                    <td className="px-4 py-3 text-xs font-medium">{u.report_count}</td>
                    <td className="px-4 py-3 text-xs font-medium">{(u.followers_count || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
