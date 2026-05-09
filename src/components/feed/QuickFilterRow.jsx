import React from "react";

const FILTERS = [
  { id: "all",     label: "All" },
  { id: "long",    label: "📈 Long" },
  { id: "short",   label: "📉 Short" },
  { id: "trending",label: "🔥 Hot" },
  { id: "Tech",    label: "Tech" },
  { id: "Finance", label: "Finance" },
  { id: "Energy",  label: "Energy" },
  { id: "small",   label: "Small Cap" },
];

export default function QuickFilterRow({ active, onChange }) {
  return (
    <div style={{
      display:'flex', gap:8, overflowX:'auto', padding:'12px 0',
      scrollbarWidth:'none', msOverflowStyle:'none',
    }}>
      <style>{`.qfr::-webkit-scrollbar{display:none}`}</style>
      {FILTERS.map(f => {
        const isActive = active === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            style={{
              padding:'6px 14px',
              borderRadius:20,
              fontSize:12,
              fontWeight:600,
              whiteSpace:'nowrap',
              border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: isActive ? '#2563eb' : '#f1f5f9',
              color: isActive ? '#ffffff' : '#64748b',
              cursor:'pointer',
              transition:'all 150ms ease',
              flexShrink:0,
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}