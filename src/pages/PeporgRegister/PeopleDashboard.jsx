import React, { useEffect, useState } from "react";
import { icons } from "./PeopleDashboard.icons";
import { useNavigate } from "react-router-dom";
import DetailsLayout from "../DetailsLayout";
import { listPeople } from "../../data/People/People.Repository";
import { listQualifications } from "../../data/Qualifications/Qualifications.Repository";
import { findAll as listOrganisations } from "../../data/Organisation/Organisation.repository";
import OrgDropdown from "./OrgDropdown";
import "../Home/home.css";
import "../../Styles/PeopleDashboard.css";

export default function PeopleDashboard() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(true);

  // --- Navigation Handlers for Portal Buttons ---
  const handleOrgClick = () => {
    if (selectedOrgId) {
      navigate(`/peporg/${selectedOrgId}`);
    }
  };
  const handlePplClick = () => {
    if (selectedOrgId) {
      navigate(`/peporg/${selectedOrgId}`, { state: { initialTab: "people" } });
    }
  };

  // --- STEP 1: Fetch Organizations only on mount ---
  useEffect(() => {
    async function fetchInitialOrgs() {
      setLoading(true);
      try {
        const orgRes = await listOrganisations();
        setOrgs(orgRes?.rows || orgRes || []);
      } catch (e) {
        console.error("Dashboard Load Error (Orgs):", e);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialOrgs();
  }, []);

  // --- STEP 2: Fetch Data only when an Organization is selected ---
  useEffect(() => {
    if (!selectedOrgId || selectedOrgId === "") {
      setPeople([]);
      setQualifications([]);
      return;
    }
    async function fetchOrgData() {
      try {
        const [peopleRes, qualRes] = await Promise.all([
          listPeople({ orgId: selectedOrgId, limit: 1000 }),
          listQualifications({ orgId: selectedOrgId, limit: 2000 })
        ]);
        setPeople(peopleRes?.rows || peopleRes || []);
        setQualifications(qualRes?.rows || qualRes || []);
      } catch (e) {
        console.error("Dashboard Load Error (Org Specific):", e);
      }
    }
    fetchOrgData();
  }, [selectedOrgId]);

  // --- Filter Logic ---
  const filteredPeople = selectedOrgId 
    ? people.filter(p => String(p.orgId) === String(selectedOrgId)) 
    : [];
  const filteredQuals = selectedOrgId 
    ? qualifications.filter(q => String(q.orgId) === String(selectedOrgId)) 
    : [];


  // --- Metrics ---
  const totalPeople = selectedOrgId ? filteredPeople.length : '--';
  const management = filteredPeople.filter(p => {
    const sl = (p.staffLevel || "").toUpperCase();
    return sl.startsWith("M2") || sl.startsWith("M3") || sl.startsWith("E1") || sl.startsWith("E2");
  });
  const leads = filteredPeople.filter(p => {
    const sl = (p.staffLevel || "").toUpperCase();
    return sl.startsWith("M1") || sl.startsWith("P4");
  });
  let leadershipCoverage = "—";
  if (selectedOrgId) {
    const denom = management.length + leads.length;
    if (denom > 0) {
      leadershipCoverage = `${totalPeople} : ${denom}`;
    } else {
      leadershipCoverage = `${totalPeople} : —`;
    }
  }
  const permanent = selectedOrgId ? filteredPeople.filter(p => (p.employeeType || "").toLowerCase() === "permanent").length : '--';
  const temp = selectedOrgId ? filteredPeople.filter(p => (p.employeeType || "").toLowerCase().includes("temp")).length : '--';
  const freelance = selectedOrgId ? filteredPeople.filter(p => (p.employeeType || "").toLowerCase().includes("free")).length : '--';
  const now = new Date();


  // --- Expired Qualifications Calculation (using 'renewal' field) ---
  function isExpiredQualification(qual, today) {
    if (!qual || !qual.renewal) return false;
    return qual.renewal < today;
  }
  const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  // Expired qualifications for this org
  const expiredQuals = filteredQuals.filter(q => isExpiredQualification(q, todayStr));
  const expiredQualsByPerson = {};
  expiredQuals.forEach(q => {
    if (q.personId) {
      expiredQualsByPerson[q.personId] = (expiredQualsByPerson[q.personId] || 0) + 1;
    }
  });
  const expiredPeopleIds = Object.keys(expiredQualsByPerson);

  const expiring6mo = selectedOrgId ? filteredQuals.filter(q => {
    if (!q.expiryDate) return false;
    const d = new Date(q.expiryDate);
    return d > now && d < new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
  }).length : '--';
  const deptCounts = selectedOrgId ? filteredPeople.reduce((acc, p) => {
    const dept = p.department || "Unassigned";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {}) : {};
  const totalRequiredQuals = filteredQuals.length;
  const validQuals = filteredQuals.filter(q => q.expiryDate && new Date(q.expiryDate) > now).length;
  const compliance = selectedOrgId && totalRequiredQuals > 0 
    ? Math.round((validQuals / totalRequiredQuals) * 100) 
    : '--';

  // --- Tile Render Helpers ---
  const Icon = (Ico, props = {}) => Ico ? <Ico size={28} style={{ marginBottom: 6, color: "#00b4ff", ...props.style }} /> : null;
  const renderTile = (title, value, sub, icon, extraClass = "", onClick, clickable = false) => (
    <div
      className={`tile${clickable ? " clickable" : ""} ${extraClass}`}
      style={{ minWidth: 220, minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={clickable && onClick ? onClick : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? "button" : undefined}
      aria-disabled={!clickable}
    >
      {icon && <div style={{ marginBottom: 2 }}>{Icon(icon)}</div>}
      <div className="tile-value" style={{ fontSize: 44, fontWeight: 900, color: "#00b4ff", marginBottom: 2 }}>
        {value}{selectedOrgId && title === "Compliance Health" ? "%" : ""}
      </div>
      <div className="tile-title" style={{ color: "#b3e0ff", fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{title}</div>
      <div className="tile-sub" style={{ color: "#b3e0ff", fontSize: 15, marginTop: 2 }}>{sub}</div>
    </div>
  );

  const sidebar = (
    <div className="sideBlocks">
      <div className="sideBlock">
        {/* Organisation Selector at the top */}
        <OrgDropdown orgs={orgs} selectedOrgId={selectedOrgId} setSelectedOrgId={setSelectedOrgId} />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#888',
            textAlign: 'right',
            marginTop: 2,
            marginBottom: 18,
            letterSpacing: 0.5,
            width: '100%',
          }}
        >
          ACTIVE SCOPE
        </div>
        <div style={{ borderTop: '1px solid #ececf3', margin: '12px 0 16px 0', width: '100%' }} />
        <div className="sideBlock__title">ACTIONS</div>
        <button
          className="btn btnPrimary"
          tabIndex={0}
          onClick={() => {
            navigate("/peporg/register");
          }}
        >
          Back to Register
        </button>
        <button className="btn btnPrimary" style={{marginTop: 16}} onClick={() => navigate("/peporg/new")}>New Organisation</button>
      </div>
    </div>
  );

  // --- HEADER STRUCTURAL & STYLING REFACTOR ---
  return (
    <DetailsLayout
      title="Workforce Dashboard"
      subtitle="Live workforce and compliance metrics"
      sidebarContent={sidebar}
      onOrgClick={handleOrgClick}
      onPplClick={handlePplClick}
    >
      {loading ? (
        <div style={{ color: "#fff", fontSize: 22, padding: 40 }}>Initializing Analytics Engine...</div>
      ) : (
        <div className="tileGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 28, marginTop: 0 }}>
          {renderTile(
            "Total People",
            totalPeople,
            "",
            icons.people,
            "",
            () => {
              if (selectedOrgId) {
                navigate(`/peporg/${selectedOrgId}`, { state: { initialTab: "people" } });
              }
            },
            Boolean(selectedOrgId)
          )}
          {/* Management Layer */}
          <div
            className="tile tile-mgmt clickable"
            style={{ minWidth: 320, minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={() => {
              if (selectedOrgId) {
                navigate(`/peporg/${selectedOrgId}`, { state: { initialTab: "leadership" } });
              }
            }}
            tabIndex={0}
            role="button"
            aria-disabled={!selectedOrgId}
          >
            <div style={{ display: 'flex', gap: 32, width: '100%', justifyContent: 'center', marginBottom: 2 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                {Icon(icons.managers)}
                <div style={{ fontSize: 36, fontWeight: 900, color: '#00b4ff' }}>{selectedOrgId ? management.length : '--'}</div>
                <div style={{ color: '#b3e0ff', fontWeight: 700, fontSize: 16 }}>Strategic Managers</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                {Icon(icons.leads)}
                <div style={{ fontSize: 36, fontWeight: 900, color: '#00b4ff' }}>{selectedOrgId ? leads.length : '--'}</div>
                <div style={{ color: '#b3e0ff', fontWeight: 700, fontSize: 16 }}>Operational Leads</div>
              </div>
            </div>
            <div className="tile-title" style={{ color: "#b3e0ff", fontWeight: 700, fontSize: 18, marginTop: 4, marginBottom: 0 }}>
              Management Layer
            </div>
            <div style={{ color: '#b3e0ff99', fontSize: 12, marginTop: 8, fontWeight: 500, letterSpacing: 0.2 }}>
              Leadership Coverage: {leadershipCoverage}
            </div>
          </div>
          {/* Workforce Type */}
          <div className="tile tile-workforce" style={{ minWidth: 320, minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 18, width: '100%', justifyContent: 'center', marginBottom: 2 }}>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer' }}
                onClick={() => selectedOrgId && navigate(`/peporg/${selectedOrgId}`, { state: { initialTab: 'people', initialFilter: 'Permanent' } })}
                tabIndex={0}
                role="button"
                aria-disabled={!selectedOrgId}
              >
                {Icon(icons.permanent)}
                <div style={{ fontSize: 32, fontWeight: 900, color: '#00b4ff' }}>{permanent}</div>
                <div style={{ color: '#b3e0ff', fontWeight: 700, fontSize: 14 }}>Permanent</div>
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer' }}
                onClick={() => selectedOrgId && navigate(`/peporg/${selectedOrgId}`, { state: { initialTab: 'people', initialFilter: 'Temp Hire' } })}
                tabIndex={0}
                role="button"
                aria-disabled={!selectedOrgId}
              >
                {Icon(icons.temp)}
                <div style={{ fontSize: 32, fontWeight: 900, color: '#00b4ff' }}>{temp}</div>
                <div style={{ color: '#b3e0ff', fontWeight: 700, fontSize: 14 }}>Temp</div>
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer' }}
                onClick={() => selectedOrgId && navigate(`/peporg/${selectedOrgId}`, { state: { initialTab: 'people', initialFilter: 'Freelancer' } })}
                tabIndex={0}
                role="button"
                aria-disabled={!selectedOrgId}
              >
                {Icon(icons.freelance)}
                <div style={{ fontSize: 32, fontWeight: 900, color: '#00b4ff' }}>{freelance}</div>
                <div style={{ color: '#b3e0ff', fontWeight: 700, fontSize: 14 }}>Freelance</div>
              </div>
            </div>
            <div className="tile-sub" style={{ color: "#b3e0ff", fontSize: 15, marginTop: 4 }}>Workforce Type</div>
          </div>
          {/* Qualification Risk */}
          <div
            className={`tile ${expiredQuals.length > 0 ? 'tile-bad clickable' : 'clickable'}`}
            style={{ border: expiredQuals.length > 0 ? '2px solid #ff3b47' : undefined }}
            onClick={() => {
              if (selectedOrgId) {
                navigate(`/peporg/${selectedOrgId}`, { state: { initialTab: 'people', initialFilter: 'Expired' } });
              }
            }}
            tabIndex={0}
            role="button"
            aria-disabled={!selectedOrgId}
          >
            <div style={{ marginBottom: 2 }}>{Icon(icons.expired, { style: { color: expiredQuals.length > 0 ? '#ff3b47' : '#00b4ff' } })}</div>
            <div className="tile-value" style={{ fontSize: 44, fontWeight: 900, color: expiredQuals.length > 0 ? '#ff3b47' : '#00b4ff' }}>{expiredQuals.length}</div>
            <div className="tile-title" style={{ color: expiredQuals.length > 0 ? '#ff3b47' : '#b3e0ff' }}>Expired Qualifications</div>
            <div className="tile-sub">Critical Immediate Action</div>
          </div>
          {renderTile("Compliance Health", compliance, "Valid Qualifications", icons.valid)}
          {/* Department Distribution */}
          <div className="tile tile-dept" style={{ minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="tile-title" style={{ color: "#00b4ff", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Department Distribution</div>
            <div style={{ width: '100%', maxWidth: 260 }}>
              {selectedOrgId && Object.keys(deptCounts).length > 0 ? (
                Object.entries(deptCounts).map(([dept, count]) => (
                  <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: "#b3e0ff" }}>{dept}</span>
                    <span style={{ color: "#fff", fontWeight: 800 }}>{count}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>No Data Available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </DetailsLayout>
  );
}