import React, { useState, useRef, useEffect } from "react";

export default function OrgDropdown({ orgs, selectedOrgId, setSelectedOrgId }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();
  const selectedOrg = orgs.find(o => (o._id || o.id) === selectedOrgId);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 220 }}>
      <span style={{ fontSize: 11, color: '#6bb6e6', letterSpacing: 1, marginBottom: 2, marginLeft: 2, opacity: 0.7 }}>FILTER BY SCOPE</span>
      <div ref={ref} style={{ position: 'relative', width: '100%' }}>
        <button
          type="button"
          onClick={() => setIsOpen(o => !o)}
          className="org-dropdown-trigger"
          style={{
            width: '100%',
            background: 'rgba(18,28,38,0.98)',
            border: isOpen ? '1.5px solid #00d1ff' : '1px solid rgba(0,209,255,0.3)',
            color: '#b3e0ff',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            fontWeight: 700,
            fontSize: 16,
            padding: '12px 44px 12px 18px',
            borderRadius: 10,
            outline: 'none',
            cursor: 'pointer',
            boxShadow: isOpen ? '0 0 10px #00b4ff88' : 'none',
            display: 'flex',
            alignItems: 'center',
            transition: 'border 0.2s, box-shadow 0.2s',
            position: 'relative',
          }}
        >
          {selectedOrg ? (selectedOrg.orgName || selectedOrg.name || selectedOrg._id || selectedOrg.id) : 'Select Organization...'}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00b4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {isOpen && (
          <div
            className="org-dropdown-list"
            style={{
              position: 'absolute',
              top: 'calc(100% + 7px)',
              left: 0,
              width: '100%',
              zIndex: 1000,
              background: 'rgba(10,18,28,0.98)',
              borderRadius: 10,
              boxShadow: '0 8px 32px #00b4ff22',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              border: '1.5px solid #00b4ff44',
              padding: '4px 0',
            }}
          >
            {orgs.length === 0 && (
              <div style={{ color: '#888', padding: '12px 18px', fontSize: 15 }}>No organizations found</div>
            )}
            {orgs.map(org => {
              const isSelected = (org._id || org.id) === selectedOrgId;
              return (
                <div
                  key={org._id || org.id}
                  onClick={() => { setSelectedOrgId(org._id || org.id); setIsOpen(false); }}
                  style={{
                    padding: '12px 18px',
                    background: isSelected ? '#00b4ff' : 'transparent',
                    color: isSelected ? '#0a1820' : '#b3e0ff',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: 16,
                    cursor: 'pointer',
                    letterSpacing: 1.2,
                    borderLeft: isSelected ? '4px solid #00b4ff' : '4px solid transparent',
                    transition: 'background 0.18s, color 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#00b4ff'}
                  onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#00b4ff' : 'transparent'}
                >
                  {org.orgName || org.name || org._id || org.id}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
