import React from "react";

export default function FeedSkeletonCard() {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      marginBottom: 12,
    }}>
      <style>{`
        @keyframes skeletonPulse { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        .sk { background:#e2e8f0; border-radius:6px; animation:skeletonPulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Author row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div className="sk" style={{ width:40, height:40, borderRadius:'50%', flexShrink:0 }} />
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
          <div className="sk" style={{ width:120, height:12 }} />
          <div className="sk" style={{ width:80, height:10 }} />
        </div>
      </div>

      {/* Prediction pill */}
      <div className="sk" style={{ width:150, height:28, borderRadius:8, marginBottom:12 }} />

      {/* Title lines */}
      <div className="sk" style={{ width:'90%', height:16, marginBottom:8 }} />
      <div className="sk" style={{ width:'70%', height:16, marginBottom:14 }} />

      {/* Excerpt lines */}
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
        <div className="sk" style={{ width:'100%', height:12 }} />
        <div className="sk" style={{ width:'92%', height:12 }} />
        <div className="sk" style={{ width:'80%', height:12 }} />
      </div>

      {/* Footer */}
      <div style={{ display:'flex', gap:12, paddingTop:12, borderTop:'1px solid #f1f5f9' }}>
        <div className="sk" style={{ width:40, height:14 }} />
        <div className="sk" style={{ width:60, height:14 }} />
        <div className="sk" style={{ width:40, height:14 }} />
      </div>
    </div>
  );
}