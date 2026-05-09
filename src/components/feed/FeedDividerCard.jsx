import React from "react";
import { Link } from "react-router-dom";
import { getAnalystSlug } from "@/lib/analystSlug";

export function TrendingDivider({ report }) {
  if (!report) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
      borderRadius: 12,
      border: '1px dashed #bfdbfe',
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ fontSize:14 }}>🔥</span>
        <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Trending Right Now
        </span>
      </div>
      <Link to={`/report?id=${report.id}`} style={{ textDecoration:'none' }}>
        <p style={{ fontSize:13, fontWeight:600, color:'#0f172a', lineHeight:1.4, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {report.title}
        </p>
        <p style={{ fontSize:11, color:'#64748b' }}>{report.likes || 0} likes · {report.author_name || "Analyst"}</p>
        <p style={{ fontSize:11, color:'#2563eb', fontWeight:600, marginTop:6 }}>Join the conversation →</p>
      </Link>
    </div>
  );
}

export function AnalystSpotlight({ analyst }) {
  if (!analyst) return null;
  const name = analyst.full_name || analyst.email?.split("@")[0] || "Analyst";
  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
      borderRadius: 12,
      border: '1px dashed #bfdbfe',
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ fontSize:14 }}>📊</span>
        <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Analyst Spotlight
        </span>
      </div>
      <Link to={`/analyst/${getAnalystSlug(analyst)}`} style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'#dbeafe', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#2563eb', overflow:'hidden' }}>
          {analyst.picture ? <img src={analyst.picture} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : name[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{name}</p>
          <p style={{ fontSize:11, color:'#64748b' }}>{analyst.accuracy_score?.toFixed(1)}% accuracy · {analyst.accuracy_tier || "Building"}</p>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:'#2563eb', border:'1px solid #2563eb', borderRadius:6, padding:'3px 10px' }}>Follow</span>
      </Link>
    </div>
  );
}