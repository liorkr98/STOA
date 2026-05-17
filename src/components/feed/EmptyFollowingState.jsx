import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { analystHref } from "@/lib/analystSlug";
import AccuracyTierBadge from "./AccuracyTierBadge";

export default function EmptyFollowingState({ onFollow }) {
  const [topAnalysts, setTopAnalysts] = useState([]);

  useEffect(() => {
    base44.entities.User.list("-accuracy_score", 5)
      .then(data => setTopAnalysts((data || []).filter(u => u.accuracy_score > 0).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding:'24px 0' }}>
      <div style={{
        background:'linear-gradient(135deg,#eff6ff,#f0fdf4)',
        border:'1px solid #bfdbfe', borderRadius:12, padding:20, marginBottom:16,
      }}>
        <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:4 }}>🔥 Hot right now</p>
        <p style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Follow top researchers to see their reports here</p>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {topAnalysts.map(a => {
            const name = a.full_name || a.email?.split("@")[0] || "Researcher";
            return (
              <div key={a.id} style={{
                display:'flex', alignItems:'center', gap:10,
                background:'#fff', borderRadius:8, padding:'10px 12px',
                border:'1px solid #e2e8f0',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', background:'#dbeafe',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700, color:'#2563eb', overflow:'hidden', flexShrink:0,
                }}>
                  {a.picture
                    ? <img src={a.picture} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <Link to={analystHref(a)} style={{ fontSize:13, fontWeight:600, color:'#0f172a', textDecoration:'none' }}>
                    {name}
                  </Link>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                    <AccuracyTierBadge accuracy={a.accuracy_score} />
                  </div>
                </div>
                <button
                  onClick={() => onFollow && onFollow(a)}
                  style={{
                    fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:6,
                    background:'#2563eb', color:'#fff', border:'none', cursor:'pointer',
                    flexShrink:0,
                  }}
                >
                  Follow
                </button>
              </div>
            );
          })}
        </div>

        {topAnalysts.length > 0 && (
          <Link to="/leaderboard" style={{ display:'block', marginTop:12, fontSize:12, color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
            + Discover all researchers →
          </Link>
        )}
      </div>
    </div>
  );
}