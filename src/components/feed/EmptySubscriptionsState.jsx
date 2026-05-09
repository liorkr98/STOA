import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { getAnalystSlug } from "@/lib/analystSlug";
import AccuracyTierBadge from "./AccuracyTierBadge";

export default function EmptySubscriptionsState() {
  const [topAnalysts, setTopAnalysts] = useState([]);

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 5)
      .then(data => setTopAnalysts((data || []).filter(u => u.accuracy_score > 0).slice(0, 3)))
      .catch(() => {});
  }, []);

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
            const name = a.full_name || a.email?.split("@")[0] || "Analyst";
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
                    <span style={{ fontSize:10, color:'#94a3b8' }}>{a.total_calls || 0} calls</span>
                  </div>
                </div>
                <Link
                  to={`/analyst/${getAnalystSlug(a)}`}
                  style={{
                    fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:6,
                    background:'#d97706', color:'#fff', textDecoration:'none',
                    flexShrink:0,
                  }}
                >
                  Subscribe
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}