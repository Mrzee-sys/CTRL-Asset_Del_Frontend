import React, { useEffect, useState, useMemo } from "react";
import { FiUserCheck, FiFileText, FiShield, FiActivity, FiBook, FiAlertTriangle } from "react-icons/fi";
import { Plus, Pencil, UploadCloud, CloudDownload, Building2, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DetailsLayout from "../DetailsLayout";
import { listPeople } from "../../data/People/People.Repository";
import { listQualifications } from "../../data/Qualifications/Qualifications.Repository";
import { findAll as listOrganisations } from "../../data/Organisation/Organisation.repository";
import { getMedicalHistory } from "../../data/MedicalHist/MedHist.Repository";
import OrganizationSelector from "../../components/OrganizationSelector";
import "../Home/home.css";
import "../../Styles/PeopleDashboard.css";

export default function PeopleDashboard() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [medRefreshTick, setMedRefreshTick] = useState(0);

  // Medical history aggregated for the org
  const [medRecords, setMedRecords] = useState([]);

  const handleOrgClick = () => {
    if (selectedOrgId) {
      const cleanId = String(selectedOrgId).trim();
      navigate(`/peporg/${encodeURIComponent(cleanId)}`);
    }
  };
  
  const handlePplClick = () => {
    if (selectedOrgId) {
      const cleanId = String(selectedOrgId).trim();
      navigate(`/peporg/${encodeURIComponent(cleanId)}`, { state: { initialTab: "people" } });
    }
  };

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

  useEffect(() => {
    if (!selectedOrgId) {
      setPeople([]);
      setQualifications([]);
      setMedRecords([]);
      return;
    }
    async function fetchOrgData() {
      try {
        const [peopleRes, qualRes] = await Promise.all([
          listPeople({ orgId: selectedOrgId, limit: 1000 }),
          listQualifications({ orgId: selectedOrgId, limit: 2000 }),
        ]);
        setPeople(peopleRes?.rows || peopleRes || []);
        setQualifications(qualRes?.rows || qualRes || []);
      } catch (e) {
        console.error("Dashboard Load Error (Org Specific):", e);
      }
    }
    fetchOrgData();
  }, [selectedOrgId]);

  // --- STEP 3: Fetch medical records for all people in org ---
  useEffect(() => {
    const filtered = selectedOrgId
      ? people.filter(p => String(p.orgId) === String(selectedOrgId))
      : [];
    if (!selectedOrgId || filtered.length === 0) { setMedRecords([]); return; }
    let alive = true;
    (async () => {
      try {
        const batches = await Promise.allSettled(
          filtered.map(p => getMedicalHistory(p.id || p._id))
        );
        if (!alive) return;
        setMedRecords(batches.flatMap(b => b.status === "fulfilled" ? b.value : []));
      } catch { if (alive) setMedRecords([]); }
    })();
    return () => { alive = false; };
  }, [selectedOrgId, people, medRefreshTick]);

  useEffect(() => {
    const handleMedicalUpdate = () => setMedRefreshTick((v) => v + 1);
    const handleStorage = (event) => {
      if (event.key === "medhist:lastUpdate") handleMedicalUpdate();
    };
    window.addEventListener("medhist-updated", handleMedicalUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("medhist-updated", handleMedicalUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // ✅ THE FIX: Wrap these in useMemo to KILL THE INFINITE LOOP that was freezing the router
  const filteredPeople = useMemo(() => {
    return selectedOrgId ? people.filter(p => String(p.orgId) === String(selectedOrgId)) : [];
  }, [selectedOrgId, people]);

  const filteredQuals = useMemo(() => {
    return selectedOrgId ? qualifications.filter(q => String(q.orgId) === String(selectedOrgId)) : [];
  }, [selectedOrgId, qualifications]);

  const totalPeopleCount = selectedOrgId ? filteredPeople.length : 0;
  const now = new Date();

  const todayStr = now.toISOString().slice(0, 10);
  const [expiredPeopleIds, setExpiredPeopleIds] = useState([]);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    setExpiredPeopleIds([]);
    setExpiredCount(0);
    if (!selectedOrgId || filteredPeople.length === 0) {
      setExpiredPeopleIds([]);
      setExpiredCount(0);
      return;
    }
    const peopleIds = new Set(filteredPeople.map(p => p.id || p._id));
    const expired = qualifications.filter(
      q => q.renewal && q.renewal < todayStr && peopleIds.has(q.personId)
    );
    const ids = expired.map(q => q.personId).filter(Boolean);
    const uniqueIds = Array.from(new Set(ids));
    setExpiredPeopleIds(uniqueIds);
    setExpiredCount(uniqueIds.length);
  }, [selectedOrgId, filteredPeople, qualifications, todayStr]);

  // Tile 1: Certification Compliance based on unique people with valid qualifications
  const personIdsInOrg = new Set(filteredPeople.map((p) => String(p.id || p._id)));
  const peopleWithValidQualifications = selectedOrgId
    ? new Set(
        filteredQuals
          .filter((q) => q.personId && personIdsInOrg.has(String(q.personId)) && q.renewal && q.renewal >= todayStr)
          .map((q) => String(q.personId))
      )
    : new Set();
  const certValidCount = selectedOrgId ? peopleWithValidQualifications.size : 0;
  const certExpiredCount = selectedOrgId ? Math.max(totalPeopleCount - certValidCount, 0) : 0;
  const certComplianceRate = selectedOrgId && totalPeopleCount > 0
    ? Math.round((certValidCount / totalPeopleCount) * 100)
    : 0;

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isPositiveStatus = (value) => {
    if (typeof value !== "string") return false;
    const normalized = value.toLowerCase();
    return ["valid", "completed", "cleared", "pass", "passed", "approved", "active", "fit"].some((status) => normalized.includes(status));
  };

  const medLatestByEmployee = selectedOrgId
    ? (() => {
        const byPerson = new Map();
        medRecords.forEach((record) => {
          const key = String(record.employee_id || "");
          if (!key) return;
          const current = byPerson.get(key);
          const recordDate = parseDate(record.last_medical_date) || parseDate(record.expiry_date) || new Date(0);
          const currentDate = current
            ? (parseDate(current.last_medical_date) || parseDate(current.expiry_date) || new Date(0))
            : new Date(0);
          if (!current || recordDate >= currentDate) byPerson.set(key, record);
        });
        return Array.from(byPerson.values());
      })()
    : [];

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(now.getFullYear() - 1);

  const medicalRecentCount = selectedOrgId
    ? medLatestByEmployee.filter((record) => {
        const lastMedical = parseDate(record.last_medical_date);
        return lastMedical && lastMedical >= twelveMonthsAgo && lastMedical <= now;
      }).length
    : 0;

  const normalizeMedicalStatus = (value) => String(value || "").trim().toLowerCase();

  const medFitnessRestrictedRecords = selectedOrgId
    ? medRecords.filter((r) => normalizeMedicalStatus(r.fitness_status) === "fit with restrictions").length
    : 0;
  const medFitnessUnfitRecords = selectedOrgId
    ? medRecords.filter((r) => {
        const status = normalizeMedicalStatus(r.fitness_status);
        return status === "temporarily unfit" || status === "unfit";
      }).length
    : 0;

  const fitLatestRecords = selectedOrgId
    ? medLatestByEmployee.filter((r) => normalizeMedicalStatus(r.fitness_status) === "fit")
    : [];

  const medForecastDueLt30 = selectedOrgId
    ? fitLatestRecords.filter((r) => {
        const expiry = parseDate(r.expiry_date);
        if (!expiry) return false;
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 30;
      }).length
    : 0;
  const medForecastDue31To60 = selectedOrgId
    ? fitLatestRecords.filter((r) => {
        const expiry = parseDate(r.expiry_date);
        if (!expiry) return false;
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 31 && days <= 60;
      }).length
    : 0;
  const medForecastDue61To90 = selectedOrgId
    ? fitLatestRecords.filter((r) => {
        const expiry = parseDate(r.expiry_date);
        if (!expiry) return false;
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 61 && days <= 90;
      }).length
    : 0;

  const medFitCount = selectedOrgId
    ? (() => {
        let fit = 0;
        medLatestByEmployee.forEach((record) => {
          if (normalizeMedicalStatus(record.fitness_status) === "fit") fit += 1;
        });
        return fit;
      })()
    : 0;

  const medOverdueCount = selectedOrgId
    ? (() => {
        let overdue = 0;
        medLatestByEmployee.forEach((record) => {
          const expiry = parseDate(record.expiry_date);
          if (!expiry || expiry < now) overdue += 1;
        });
        return overdue;
      })()
    : 0;

  const medPct = selectedOrgId && totalPeopleCount > 0 ? Math.round((medFitCount / totalPeopleCount) * 100) : 0;

  const inductionComplete = selectedOrgId
    ? filteredPeople.filter((p) => {
        if (p.mandatoryTrainingComplete === true) return true;
        return isPositiveStatus(p.inductionStatus || p.trainingStatus || p.mandatoryTrainingStatus);
      }).length
    : 0;
  const inductionPct = selectedOrgId && totalPeopleCount > 0 ? Math.round((inductionComplete / totalPeopleCount) * 100) : 0;

  const docsComplete = selectedOrgId
    ? filteredPeople.filter((p) => p.signedNDA === true).length
    : 0;
  const docsPct = selectedOrgId && totalPeopleCount > 0 ? Math.round((docsComplete / totalPeopleCount) * 100) : 0;

  const vettingComplete = selectedOrgId
    ? filteredPeople.filter((p) => {
        const criminalOk = p.criminalCheckCleared === true || isPositiveStatus(p.criminalCheckStatus);
        const creditOk = p.creditCheckCleared === true || isPositiveStatus(p.creditCheckStatus);
        const backgroundOk = p.backgroundCheckCleared === true || isPositiveStatus(p.backgroundCheckStatus);
        return criminalOk && (creditOk || backgroundOk);
      }).length
    : 0;
  const vettingPct = selectedOrgId && totalPeopleCount > 0 ? Math.round((vettingComplete / totalPeopleCount) * 100) : 0;

  const avgAge = selectedOrgId && filteredPeople.length > 0
    ? Math.round(
        filteredPeople.reduce((sum, person) => {
          const dob = parseDate(person.dateOfBirth || person.dob || person.birthDate);
          if (!dob) return sum;
          const age = now.getFullYear() - dob.getFullYear() - (new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) > now ? 1 : 0);
          return sum + Math.max(age, 0);
        }, 0) / filteredPeople.length
      )
    : "--";

  const avgTenure = selectedOrgId && filteredPeople.length > 0
    ? (
        filteredPeople.reduce((sum, person) => {
          const startDate = parseDate(person.startDate || person.hireDate || person.employmentStartDate || person.dateJoined);
          if (!startDate) return sum;
          const years = Math.max(0, (now - startDate) / (1000 * 60 * 60 * 24 * 365.25));
          return sum + years;
        }, 0) / filteredPeople.length
      ).toFixed(1)
    : "--";

  let under30 = 0;
  let age30to39 = 0;
  let age40to49 = 0;
  let age50to59 = 0;
  let over60 = 0;

  filteredPeople.forEach((person) => {
    const age = Number(person?.age);
    if (!Number.isFinite(age) || age < 0) return;
    if (age < 30) under30 += 1;
    else if (age <= 39) age30to39 += 1;
    else if (age <= 49) age40to49 += 1;
    else if (age <= 59) age50to59 += 1;
    else over60 += 1;
  });

  const toChartY = (count) => Math.max(5, 100 - (count * 10));
  const ageBarData = [
    { label: "<30", count: under30, x: 10 },
    { label: "30-39", count: age30to39, x: 70 },
    { label: "40-49", count: age40to49, x: 130 },
    { label: "50-59", count: age50to59, x: 190 },
    { label: "60+", count: over60, x: 250 },
  ];

  const metricTileStyle = {
    width: "100%", minHeight: 300, height: 300, maxHeight: 300,
    display: "flex", flexDirection: "column", alignItems: "stretch",
    justifyContent: "space-between", gap: 4,
  };
  const renderStatCard = ({ title, icon: IcoComp, primary, secondary, body, footer, onClick }) => (
    <div
      className="tile statCard clickable"
      style={{ ...metricTileStyle, cursor: selectedOrgId ? "pointer" : "default" }}
      onClick={selectedOrgId ? onClick : undefined}
      tabIndex={0}
      role="button"
      aria-disabled={!selectedOrgId}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && selectedOrgId) { e.preventDefault(); onClick?.(); } }}
    >
      <div className="tile-content-wrapper">
        <div className="tile-watermark"><IcoComp size={180} /></div>
        <div className="tile-body">
          <div className="tile-title" style={{ color: "#b3e0ff", fontWeight: 700, marginBottom: 6 }}>{title}</div>
          {primary !== undefined && (
            <div style={{ fontSize: 28, fontWeight: 900, color: "#00b4ff", lineHeight: 1.1, marginBottom: 4 }}>{primary}</div>
          )}
          {secondary !== undefined && (
            <div style={{ color: "#b3e0ff", fontSize: 14, marginBottom: 6 }}>{secondary}</div>
          )}
          {body}
        </div>
        <div className="tile-footer" style={{ borderTop: "1px solid rgba(179,224,255,0.2)", paddingTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#00b4ff" }}>{footer}</div>
        </div>
      </div>
    </div>
  );

  const navPeople = (filter) => {
    if (!selectedOrgId) return;
    const cleanId = String(selectedOrgId).trim();
    navigate(`/peporg/${encodeURIComponent(cleanId)}`, { state: { initialTab: "people", ...(filter ? { initialFilter: filter } : {}) } });
  };

  const handleAddPerson = () => {
    if (!selectedOrgId) return;
    const cleanId = String(selectedOrgId).trim();
    navigate(`/peporg/${encodeURIComponent(cleanId)}/people/new`);
  };

  const handleAddOrganization = () => {
    navigate(`/peporg/new`);
  };

  const handleEditOrganization = () => {
    if (!selectedOrgId) return;
    const cleanId = String(selectedOrgId).trim();
    navigate(`/peporg/${encodeURIComponent(cleanId)}`);
  };

  const handleImportPeople = () => {
    if (!selectedOrgId) return;
    const cleanId = String(selectedOrgId).trim();
    navigate(`/peporg/${encodeURIComponent(cleanId)}`, { state: { initialTab: "details" } });
  };

  const handleDownloadTemplate = () => {
    const headers = ["firstName", "lastName", "email", "idNumber", "passport", "phone", "employeeId", "department", "manager", "location", "gender", "age", "classification", "staffLevel", "employeeType", "status", "last_medical_date", "medical_type", "medical_expiry_date", "fitness_status", "qual_name", "qual_obtained_date", "qual_expiry_date", "signedNDA", "hasContract", "idVerified"];
    const sampleRow = ["John", "Doe", "john.doe@company.com", "9201015800081", "A12345678", "0821234567", "EMP001", "Operations", "Jane Smith", "Johannesburg", "Male", "34", "African", "P2 - Professional", "Permanent", "Active", "2025-01-15", "Periodic", "2026-01-15", "Fit", "First Aid", "2023-06-01", "2025-06-01", "True", "True", "True"];
    const csvContent = headers.join(",") + "\n" + sampleRow.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "People_Import_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenScopedOrgRegister = () => {
    if (!selectedOrgId) return;
    const cleanId = String(selectedOrgId).trim();
    navigate(`/peporg/${encodeURIComponent(cleanId)}`);
  };

  const sidebar = (
    <div className="dashboardSidebar sideBlocks">
      <div className="sideBlock">
        <OrganizationSelector selectedOrgId={selectedOrgId} setSelectedOrgId={setSelectedOrgId} onOrgChange={setSelectedOrgId} />
        <div className="sideBlock__title">TOTAL PEOPLE</div>
        <div
          style={{
            color: "#00b4ff",
            fontSize: 40,
            fontWeight: 900,
            textAlign: "center",
            width: "100%",
            marginBottom: 14,
            cursor: selectedOrgId ? "pointer" : "default",
          }}
          role="button"
          tabIndex={selectedOrgId ? 0 : -1}
          aria-disabled={!selectedOrgId}
          title={selectedOrgId ? "Open people list" : "Select an organisation"}
          onClick={() => {
            if (!selectedOrgId) return;
            const cleanId = String(selectedOrgId).trim();
            navigate(`/peporg/${encodeURIComponent(cleanId)}?tab=people`);
          }}
          onKeyDown={(e) => {
            if (!selectedOrgId) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const cleanId = String(selectedOrgId).trim();
              navigate(`/peporg/${encodeURIComponent(cleanId)}?tab=people`);
            }
          }}
        >
          {selectedOrgId ? totalPeopleCount : "--"}
        </div>
      </div>
      <div className="sideBlock">
        <div className="sideBlock__title">ACTIONS</div>
        <div className="action-row" aria-label="Sidebar actions">
          <div className="action-flicker-square" onClick={handleAddOrganization} title="Add Organisation"><div className="flicker-icon-wrapper"><Landmark size={20} /></div></div>

          <div className="action-flicker-square" onClick={handleAddPerson} title="Add Person" style={{ opacity: selectedOrgId ? 1 : 0.45, pointerEvents: selectedOrgId ? "auto" : "none" }}><div className="flicker-icon-wrapper"><Plus size={22} /></div></div>

          <div className="action-flicker-square" onClick={handleEditOrganization} title="Edit Organisation" style={{ opacity: selectedOrgId ? 1 : 0.45, pointerEvents: selectedOrgId ? "auto" : "none" }}><div className="flicker-icon-wrapper"><Pencil size={20} /></div></div>

          <div className="action-flicker-square" onClick={handleImportPeople} title="Import People" style={{ opacity: selectedOrgId ? 1 : 0.45, pointerEvents: selectedOrgId ? "auto" : "none" }}><div className="flicker-icon-wrapper"><UploadCloud size={22} /></div></div>

          <div className="action-flicker-square" onClick={handleDownloadTemplate} title="Download Template"><div className="flicker-icon-wrapper"><CloudDownload size={22} /></div></div>

          <div className="action-flicker-square" onClick={handleOpenScopedOrgRegister} title="Open Selected Organisation Card" style={{ opacity: selectedOrgId ? 1 : 0.45, pointerEvents: selectedOrgId ? "auto" : "none" }}><div className="flicker-icon-wrapper"><Building2 size={20} /></div></div>
        </div>
      </div>
      <div className="sideBlock">
        <div className="sideBlock__title">WORKFORCE INSIGHTS</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#b3e0ff", fontSize: 13 }}>Average Age</span>
          <span style={{ color: "#00b4ff", fontWeight: 800, fontSize: 13 }}>{selectedOrgId ? avgAge : "--"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: "#b3e0ff", fontSize: 13 }}>Average Tenure</span>
          <span style={{ color: "#00b4ff", fontWeight: 800, fontSize: 13 }}>{selectedOrgId ? `${avgTenure} yrs` : "--"}</span>
        </div>
        <div style={{ color: "#b3e0ff", fontSize: 12, marginBottom: 6 }}>Age Distribution</div>
        <svg viewBox="0 0 300 84" width="100%" role="img" aria-label="Age distribution chart">
          <rect x="0" y="0" width="300" height="100" rx="8" fill="#0f1b33" />
          <line x1="0" y1="84" x2="300" y2="84" stroke="#00d4ff" strokeOpacity="0.3" strokeWidth="1" />
          {ageBarData.map(({ label, count, x }) => {
            const y = toChartY(count);
            const height = Math.max(0, 100 - y);
            return (
              <g key={label}>
                <rect x={x} y={y} width="40" height={height} rx="4" fill="#00d4ff" fillOpacity="0.9" />
                {count > 0 && (
                  <text x={x + 20} y={Math.max(12, y - 6)} textAnchor="middle" fill="#eaf6ff" fontSize="9" fontWeight="700">{count}</text>
                )}
              </g>
            );
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 10px", fontSize: 10, color: "#eaf6ff", fontWeight: 700 }}>
          {ageBarData.map(({ label }) => (
            <span key={label} style={{ width: 40, textAlign: "center" }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <DetailsLayout
      title="Workforce Dashboard"
      subtitle="Live workforce and compliance metrics"
      backTo="/"
      sidebarContent={sidebar}
      renderHeaderInPanel={true}
      onOrgClick={handleOrgClick}
      onPplClick={handlePplClick}
    >
      <style>{`
        .tileGrid {
          padding: 0 !important;
          grid-template-columns: repeat(3, 1fr) !important;
          grid-template-rows: repeat(2, 300px) !important;
          gap: 24px !important;
          justify-content: stretch !important;
          justify-items: stretch !important;
          align-items: stretch !important;
        }
        .tileGrid > .tile.statCard {
          width: 100% !important; height: 300px !important;
          display: flex !important; flex: 1 1 auto !important; max-width: none !important; margin: 0 !important;
        }
        .tile-content-wrapper {
          height: 100%; display: flex; flex-direction: column; position: relative;
        }
        .tile-watermark {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          pointer-events: none; z-index: 0;
        }
        .tile-watermark svg {
          color: #00FFFF; opacity: 0.1;
          filter: drop-shadow(0 0 10px rgba(0,212,255,0.2));
        }
        .tile-body {
          flex: 1; display: flex; flex-direction: column; min-height: 0;
          width: 100%; text-align: left; position: relative; z-index: 2;
        }
        .tile-footer {
          margin-top: auto; width: 100%; text-align: left; position: relative; z-index: 2;
        }
        .dashboardSidebar, .dashboardSidebar.sideBlocks {
          height: 100% !important; max-height: none !important; overflow: visible !important;
          display: flex !important; flex-direction: column !important;
          justify-content: flex-start !important; gap: 24px !important;
          width: 100% !important; min-width: 0 !important;
        }
        .panel.panelSticky { padding-right: 0 !important; }
        .sideBlock { margin-bottom: 0 !important; flex-shrink: 0 !important; }
        .action-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          margin-bottom: 10px;
          width: 100%;
          max-width: 100%;
        }
      `}</style>

      {loading ? (
        <div style={{ color: "#fff", fontSize: 22, padding: 40 }}>Initializing Analytics Engine...</div>
      ) : (
        <div className="tileGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 300px)", gap: 24, margin: 0, padding: 0 }}>

          {renderStatCard({
            title: "Certification Compliance",
            icon: FiUserCheck,
            primary: selectedOrgId ? certValidCount : "--",
            secondary: selectedOrgId ? `${certExpiredCount} Expired` : "Select an organisation",
            body: null,
            footer: `Compliance Total: ${selectedOrgId ? `${certComplianceRate}%` : "--"}`,
            onClick: () => navPeople("Expired"),
          })}

          {renderStatCard({
            title: "Medical Surveillance",
            icon: FiFileText,
            primary: selectedOrgId ? medicalRecentCount : "--",
            secondary: selectedOrgId ? "Last Medical Within 12 Months" : "Select an organisation",
            body: null,
            footer: selectedOrgId ? `Out of ${totalPeopleCount} employees` : "Select an organisation",
            onClick: () => navPeople(),
          })}

          {renderStatCard({
            title: "Occupational Health",
            icon: ({ size }) => <FiActivity size={size} style={{ color: "#00e7ff", opacity: 0.24 }} />,
            primary: undefined,
            secondary: undefined,
            body: selectedOrgId ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "stretch",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "14px 4px 6px 2px",
                    width: "100%",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 82, padding: "8px 8px 8px 0" }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: "#00b4ff", lineHeight: 1 }}>
                        {medFitCount}
                      </div>
                      <div style={{ fontSize: 11, color: "#b3e0ff", fontWeight: 700, marginTop: 4 }}>
                        FIT
                      </div>
                    </div>

                    <div style={{ width: 1, background: "rgba(179,224,255,0.25)", alignSelf: "stretch" }} />

                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "#b3e0ff", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <span>30d: </span>
                        <span style={{ color: medForecastDueLt30 > 0 ? "#ffb347" : "#eaf6ff" }}>{medForecastDueLt30}</span>
                        <span style={{ color: "#9dd6ff" }}> | </span>
                        <span>60d: <span style={{ color: "#eaf6ff" }}>{medForecastDue31To60}</span></span>
                        <span style={{ color: "#9dd6ff" }}> | </span>
                        <span>90d: <span style={{ color: "#eaf6ff" }}>{medForecastDue61To90}</span></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ color: "#b3e0ff", fontSize: 12, lineHeight: 1.45, marginTop: 15, marginBottom: 8, width: "100%" }}>
                    <div style={{ display: "grid", rowGap: 6, width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: "#b3e0ff" }}>Overdue</span>
                        <strong style={{ color: "#ff6b7a" }}>{medOverdueCount}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: "#b3e0ff" }}>Unfit / Restricted</span>
                        <strong style={{ color: (medFitnessUnfitRecords + medFitnessRestrictedRecords) > 0 ? "#ffb347" : "#eaf6ff" }}>
                          {medFitnessUnfitRecords + medFitnessRestrictedRecords}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null,
            footer: `Compliance Total: ${selectedOrgId ? `${medPct}%` : "--"}`,
            onClick: () => navPeople(),
          })}

          {renderStatCard({
            title: "Personnel Detail",
            icon: FiBook,
            primary: selectedOrgId ? `${inductionPct}%` : "--",
            secondary: selectedOrgId ? `Complete: ${inductionComplete}  ·  Total: ${totalPeopleCount}` : "Select an organisation",
            body: null,
            footer: `Compliance Total: ${selectedOrgId ? `${inductionPct}%` : "--"}`,
            onClick: () => navPeople(),
          })}

          {renderStatCard({
            title: "Documentation Status",
            icon: FiShield,
            primary: selectedOrgId ? docsComplete : "--",
            secondary: selectedOrgId ? "Signed NDA" : "Select an organisation",
            body: null,
            footer: selectedOrgId ? `Out of ${totalPeopleCount} employees` : "Select an organisation",
            onClick: () => navPeople(),
          })}

          {renderStatCard({
            title: "Vetting Records",
            icon: FiAlertTriangle,
            primary: selectedOrgId ? `${vettingPct}%` : "--",
            secondary: selectedOrgId ? `Cleared: ${vettingComplete}  ·  Awaiting: ${totalPeopleCount - vettingComplete}` : "Select an organisation",
            body: null,
            footer: `Compliance Total: ${selectedOrgId ? `${vettingPct}%` : "--"}`,
            onClick: () => navPeople(),
          })}

        </div>
      )}
    </DetailsLayout>
  );
}