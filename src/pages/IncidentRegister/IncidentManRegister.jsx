import React, { useEffect, useState } from "react";
import "../../Styles/Register.css";
import "../../Styles/IncidentManRegister.css";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { fetchOrgs, fetchOrgById } from "../PeporgRegister/peporgApi";
import { fetchUserIncidents } from "./IncidentRegister.api";

export default function IncidentManRegister() {
    const navigate = useNavigate();
    const [orgs, setOrgs] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState("");
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    // Incident review/search state
    const [selectedPerson, setSelectedPerson] = useState("");
    const [incidents, setIncidents] = useState([]);
    const [incidentLoading, setIncidentLoading] = useState(false);
    const [incidentErr, setIncidentErr] = useState("");

    useEffect(() => {
        async function loadOrgs() {
            setLoading(true);
            setErr("");
            try {
                const data = await fetchOrgs({ limit: 100 });
                setOrgs(data.rows || []);
            } catch (e) {
                setErr(e?.message || "Failed to load organisations");
            } finally {
                setLoading(false);
            }
        }
        loadOrgs();
    }, []);

    async function handleOrgChange(e) {
        const orgId = e.target.value;
        setSelectedOrg(orgId);
        setPeople([]);
        setSelectedPerson("");
        setIncidents([]);
        if (!orgId) return;
        setLoading(true);
        setErr("");
        try {
            const org = await fetchOrgById(orgId);
            setPeople(org.people || []);
        } catch (e) {
            setErr(e?.message || "Failed to load people");
        } finally {
            setLoading(false);
        }
    }

    async function handlePersonChange(e) {
        const email = e.target.value;
        setSelectedPerson(email);
        setIncidents([]);
        if (!email || !selectedOrg) return;
        setIncidentLoading(true);
        setIncidentErr("");
        try {
            const data = await fetchUserIncidents(selectedOrg, email);
            setIncidents(data);
        } catch (e) {
            setIncidentErr(e?.message || "Failed to load incidents");
        } finally {
            setIncidentLoading(false);
        }
    }

    return (
        <div className="incident-page">
            <div className="incident-shell">
                {/* Header Row */}
                <header className="assetHeader">
                    <div className="assetHeader__nav">
                        <button className="btn btnGhost" onClick={() => navigate("/")} type="button">
                            ← Back
                        </button>
                    </div>

                    <div className="assetHeader__main">
                        <div className="assetHeader__titleBlock">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                                <h1 className="assetHeader__title" style={{ margin: 0 }}>
                                    Incident Management Register
                                </h1>
                                <span className="pill pillLive">Register</span>
                            </div>
                            <div className="assetHeader__meta" style={{ marginTop: 4, justifyContent: "center" }}>
                                <span className="metaText">Incidents</span>
                                <span className="metaDot">•</span>
                                <span className="metaText">Search and manage incidents</span>
                            </div>
                        </div>
                    </div>

                    <div className="assetHeader__right">
                        <div className="auditMeta">
                            <div className="auditRow">
                                <span className="auditLabel">Total</span>
                                <span className="auditValue">—</span>
                            </div>
                            <div className="auditRow">
                                <span className="auditLabel">Page</span>
                                <span className="auditValue">1 / 1</span>
                            </div>
                        </div>
                        <div className="headerLogos">
                            <div className="logoBox" title="Organisation">
                                <div style={{ fontWeight: 900 }}>ORG</div>
                            </div>
                            <div className="logoBox" title="People">
                                <div style={{ fontWeight: 900 }}>PPL</div>
                            </div>
                        </div>
                    </div>
                </header>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 18 }}>
                    <div className="incident-search-block" style={{ flex: 1 }}>
                        <label className="incident-label">Select Organisation</label>
                        <select className="incident-select" value={selectedOrg} onChange={handleOrgChange}>
                            <option value="">-- Select Organisation --</option>
                            {orgs.map((org) => (
                                <option key={org._id || org.id} value={org._id || org.id}>
                                    {org.orgName}
                                </option>
                            ))}
                        </select>
                        {err && <div style={{ color: "#b42318", margin: "10px 0" }}>{err}</div>}
                        {loading && <div>Loading...</div>}
                    </div>
                    {selectedOrg && !loading && (
                        <div className="incident-search-block" style={{ flex: 1 }}>
                            <label className="incident-label">Incident Search by User</label>
                            <select className="incident-select" value={selectedPerson} onChange={handlePersonChange}>
                                <option value="">-- Select User --</option>
                                {people.map((p, i) => (
                                    <option key={p.email || i} value={p.email}>{p.displayName || `${p.firstName || ""} ${p.lastName || ""}`} ({p.email})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                {incidentErr && <div style={{ color: "#b42318", margin: "10px 0" }}>{incidentErr}</div>}
                {incidentLoading && <div>Loading incidents...</div>}
                {selectedPerson && !incidentLoading && (
                    <div className="incident-table-block">
                        <table className="registerTable">
                            <thead>
                                <tr>
                                    <th>Date Reported</th>
                                    <th>Misconduct</th>
                                    <th>Behavioural Cause Analysis</th>
                                    <th>Corrective Action</th>
                                    <th>Date Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="incident-empty">No incidents found for this user.</td>
                                    </tr>
                                ) : (
                                    incidents.map((incident, idx) => (
                                        <tr
                                            key={incident._id || idx}
                                            className="registerRow"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => navigate(`/incident/${selectedOrg}/${incident._id}`)}
                                        >
                                            <td>{incident.dateReported || "—"}</td>
                                            <td>{incident.misconduct || "—"}</td>
                                            <td>{incident.behaviouralCause || "—"}</td>
                                            <td>{incident.correctiveAction || "—"}</td>
                                            <td>{incident.completedDate || "—"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {!selectedPerson && (
                    <div className="incident-table-block">
                        <table className="registerTable">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Title</th>
                                    <th>Department</th>
                                </tr>
                            </thead>
                            <tbody>
                                {people.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="incident-empty">No people found.</td>
                                    </tr>
                                ) : (
                                    people.map((p, i) => (
                                        <tr
                                            key={p.email || i}
                                            className="registerRow"
                                            style={{ cursor: "pointer" }}
                                            title="Click to open incident card"
                                            onClick={() => window.open(`/incident/${selectedOrg}/${encodeURIComponent(p.email)}`, "_self")}
                                        >
                                            <td>{p.displayName || `${p.firstName || ""} ${p.lastName || ""}`}</td>
                                            <td>{p.email || "—"}</td>
                                            <td>{p.title || "—"}</td>
                                            <td>{p.department || "—"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
