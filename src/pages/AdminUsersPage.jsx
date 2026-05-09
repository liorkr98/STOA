import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Shield, Users, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AccuracyTierBadge from "@/components/feed/AccuracyTierBadge";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return format(new Date(dateStr), "MMM d, yyyy");
}

const ROLE_STYLES = {
  admin: "bg-red-100 text-red-700 border-red-200",
  analyst: "bg-blue-100 text-blue-700 border-blue-200",
  user: "bg-gray-100 text-gray-600 border-gray-200",
};

const COLUMNS = [
  { key: "full_name", label: "User" },
  { key: "role", label: "Role" },
  { key: "accuracy_score", label: "Accuracy" },
  { key: "last_seen", label: "Last Seen" },
  { key: "created_date", label: "Joined" },
  { key: "report_count", label: "Reports" },
  { key: "followers_count", label: "Followers" },
];

export default function AdminUsersPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [reportCounts, setReportCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_date");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role !== "admin") { navigate("/dashboard"); return; }

    Promise.all([
      base44.entities.User.list("-created_date", 500),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 1000),
    ]).then(([allUsers, allReports]) => {
      setUsers(allUsers || []);
      // Count reports per user email
      const counts = {};
      (allReports || []).forEach(r => {
        if (r.created_by) counts[r.created_by] = (counts[r.created_by] || 0) + 1;
      });
      setReportCounts(counts);
    }).finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const enriched = useMemo(() => users.map(u => ({
    ...u,
    report_count: reportCounts[u.email] || 0,
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
    const headers = ["Name", "Email", "Role", "Accuracy", "Last Seen", "Joined", "Reports", "Followers"];
    const rows = sorted.map(u => [
      u.full_name || "",
      u.email || "",
      u.role || "user",
      u.accuracy_score || 0,
      u.last_seen || "",
      u.created_date || "",
      u.report_count || 0,
      u.followers_count || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Admin — Users</h1>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{sorted.length} users</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
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
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-blue-600" },
          { label: "Total Reports", value: Object.values(reportCounts).reduce((a, b) => a + b, 0), icon: FileText, color: "text-green-600" },
          { label: "Admins", value: users.filter(u => u.role === "admin").length, icon: Shield, color: "text-red-600" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap select-none"
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
                <tr key={u.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
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
                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${ROLE_STYLES[u.role] || ROLE_STYLES.user}`}>
                      {u.role || "user"}
                    </span>
                  </td>
                  {/* Accuracy */}
                  <td className="px-4 py-3">
                    {u.accuracy_score > 0
                      ? <AccuracyTierBadge accuracy={u.accuracy_score} />
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                  {/* Last Seen */}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(u.last_seen)}</td>
                  {/* Joined */}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(u.created_date)}</td>
                  {/* Reports */}
                  <td className="px-4 py-3 text-xs font-medium">{u.report_count}</td>
                  {/* Followers */}
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
    </div>
  );
}