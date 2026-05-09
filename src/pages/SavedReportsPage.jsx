import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Bookmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ReportCard from "@/components/feed/ReportCard";

export default function SavedReportsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [saved, setSaved] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/signin");
      return;
    }

    Promise.all([
      base44.entities.SavedReport.filter({ user_email: user.email }),
      base44.entities.Report.filter({ status: "published" }, "-created_date", 500),
      base44.entities.User.list("-created_date", 200),
    ])
      .then(([savedData, allReports, allUsers]) => {
        setSaved(savedData || []);
        setReports(allReports || []);
        const map = {};
        (allUsers || []).forEach(u => {
          if (u.email) map[u.email] = u;
        });
        setUserMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, navigate]);

  const savedReportIds = saved.map(s => s.report_id);
  const savedReports = reports.filter(r => savedReportIds.includes(r.id));

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Saved Reports</h1>
          <p className="text-sm text-muted-foreground">{savedReports.length} bookmarked prediction{savedReports.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : savedReports.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-muted-foreground mb-2">No saved reports yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Bookmark your favorite predictions to save them here.</p>
          <Button onClick={() => navigate("/feed")} className="text-sm">Browse Reports</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {savedReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              isSubscribed={false}
              currentUserEmail={user?.email}
              followedEmails={[]}
              allReports={reports}
              userMap={userMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}