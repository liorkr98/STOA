import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { getAnalystSlug } from "@/lib/analystSlug";
import AccuracyTierBadge from "./AccuracyTierBadge";
import { toast } from "sonner";

export default function EmptySubscriptionsState({ currentUser, onSubscribed }) {
  const [topAnalysts, setTopAnalysts] = useState([]);
  const [reportCounts, setReportCounts] = useState({});
  const [subscribing, setSubscribing] = useState({});

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 10)
      .then(data => {
        const filtered = (data || [])
          .filter(u => u.accuracy_score > 0 && u.email !== currentUser?.email)
          .slice(0, 3);
        setTopAnalysts(filtered);

        // Fetch published report counts for each analyst
        filtered.forEach(a => {
          base44.entities.Report.filter({ created_by: a.email, status: "published" }, "-created_date", 200)
            .then(reports => setReportCounts(prev => ({ ...prev, [a.email]: (reports || []).length })))
            .catch(() => {});
        });
      })
      .catch(() => {});
  }, [currentUser?.email]);

  const handleSubscribe = async (analyst) => {
    if (!currentUser) return;
    const name = analyst.full_name || analyst.email?.split("@")[0] || "Researcher";
    setSubscribing(prev => ({ ...prev, [analyst.email]: true }));
    try {
      await base44.entities.Subscription.create({
        subscriber_email: currentUser.email,
        analyst_email: analyst.email,
        analyst_name: name,
        analyst_avatar: analyst.picture || analyst.profile_picture || "",
        status: "active",
        plan: "monthly",
      });
      toast.success(`Subscribed to ${name}!`);
      onSubscribed?.();
    } catch {
      toast.error("Failed to subscribe. Try again.");
    } finally {
      setSubscribing(prev => ({ ...prev, [analyst.email]: false }));
    }
  };

  return (
    <div style={{ padding:'24px 0' }}>
      <div style={{
        background:'linear-gradient(135deg,#fffbeb,#fff7ed)',
        border:'1px solid #fcd34d', borderRadius:12, padding:20,
      }}>
        <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:4 }}>🔒 Unlock premium research</p>
        <p style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Subscribe to get full access to reports, predictions &amp; alerts</p>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {topAnalysts.map(a => {
            const name = a.full_name || a.email?.split("@")[0] || "Researcher";
            const callCount = reportCounts[a.email] ?? "—";
            const isBusy = subscribing[a.email];
            return (
              <div key={a.id} style={{
                display:'flex', alignItems:'center', gap:10,
                background:'#fff', borderRadius:8, padding:'10px 12px',
                border:'1px solid #e2e8f0',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', background:'#fef3c7',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700, color:'#d97706', overflow:'hidden', flexShrink:0,
                }}>
                  {a.picture
                    ? <img src={a.picture} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <Link to={`/analyst/${getAnalystSlug(a)}`} style={{ fontSize:13, fontWeight:600, color:'#0f172a', textDecoration:'none' }}>
                    {name}
                  </Link>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                    <AccuracyTierBadge accuracy={a.accuracy_score} />
                    <span style={{ fontSize:10, color:'#94a3b8' }}>{callCount} calls</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSubscribe(a)}
                  disabled={isBusy}
                  style={{
                    fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:6,
                    background: isBusy ? '#9ca3af' : '#d97706', color:'#fff',
                    border:'none', cursor: isBusy ? 'default' : 'pointer',
                    flexShrink:0,
                  }}
                >
                  {isBusy ? "..." : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}