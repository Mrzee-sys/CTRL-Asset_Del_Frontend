import React, { useEffect, useState } from "react";
import Zbot_Fields from "../../components/Zbot_Fields";
import { useParams, useNavigate } from "react-router-dom";
import "../../Styles/DetailPageLayout.css";
import "../../Styles/IncidentTabs.css";
import { fetchOrgPeople, saveIncident, fetchIncidentById } from "./IncidentRegister.api";
import { fetchOrgDetails } from "./IncidentRegister.orgApi";

const MISCONDUCT_OPTIONS = [
    "Absenteeism",
    "Conflict",
    "Insubordination",
    "Intimidation",
    "Intoxication",
    "Lack of Interest",
    "Overloading",
    "Sexual Haressement",
    "Speeding",
    "Theft",
    "Time Keeping",
    "Vehicle Accident"
];

export default function IncidentCard() {
    const [activeTab, setActiveTab] = useState("details");
    const { orgId, incidentId, email } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        misconduct: "",
        name: "",
        raisedBy: "",
        recipient: "",
        dateReported: "",
        incidentDate: "",
        witness1: "",
        description: "",
        behaviouralCause: "",
        correctiveAction: "",
        recommendedActions: "",
        responsiblePerson: "",
        dueDate: "",
        completedDate: ""
    });
    const [people, setPeople] = useState([]);
    const [err, setErr] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [orgDetails, setOrgDetails] = useState({});
    const [org, setOrg] = useState(null);
    const [loadingIncident, setLoadingIncident] = useState(false);

    useEffect(() => {
        async function loadPeople() {
            try {
                const list = await fetchOrgPeople(orgId);
                setPeople(list);
            } catch (e) {
                setErr(e?.message || "Failed to load people");
            }
        }
        async function loadOrgDetails() {
            try {
                const details = await fetchOrgDetails(orgId);
                setOrgDetails(details);
            } catch (e) {
                setErr(e?.message || "Failed to load org details");
            }
        }
        async function loadOrg() {
            try {
                const orgData = await fetchOrgDetails(orgId);
                setOrg(orgData);
            } catch {}
        }
        async function loadIncident() {
            if (incidentId) {
                setLoadingIncident(true);
                try {
                    const incident = await fetchIncidentById(orgId, incidentId);
                    if (incident) setForm({ ...form, ...incident });
                } catch (e) {
                    setErr(e?.message || "Failed to load incident");
                } finally {
                    setLoadingIncident(false);
                }
            } else if (email) {
                setForm(f => ({ ...f, name: email }));
            }
        }
        loadPeople();
        loadOrgDetails();
        if (orgId) loadOrg();
        loadIncident();
    }, [orgId, incidentId, email]);

    function setField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }



    function isAllFieldsValid() {
        return (
            form.misconduct &&
            form.name &&
            form.raisedBy &&
            form.recipient &&
            form.dateReported &&
            form.incidentDate &&
            form.witness1 &&
            form.description &&
            form.behaviouralCause &&
            form.correctiveAction &&
            form.recommendedActions &&
            form.responsiblePerson &&
            form.dueDate
        );
    }

    function handleSave() {
        setSaving(true);
        setErr("");
        setSuccess("");
        saveIncident(orgId, form.name, form)
            .then(() => setSuccess("Incident saved successfully!"))
            .catch(e => setErr(e?.message || "Failed to save incident"))
            .finally(() => setSaving(false));
    }

    if (loadingIncident) {
        return <div style={{ padding: 40, textAlign: "center" }}>Loading incident...</div>;
    }
    return (
        <div className="assetPage">
            <div className="assetShell">
                {/* HEADER */}

                <header className="assetHeader">
                    <div className="assetHeader__nav">
                        <button className="btn-electric btnGhost" onClick={() => navigate(-1)} type="button">
                            <span>← Back</span>
                        </button>
                    </div>

                    <div className="assetHeader__main">
                        <div className="assetHeader__titleBlock">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                                <h1 className="assetHeader__title" style={{ margin: 0 }}>
                                    Incident Card
                                </h1>
                                <span className="pill pillLive">Register</span>
                            </div>
                            <div className="assetHeader__meta" style={{ marginTop: 4, justifyContent: "center" }}>
                                <span className="metaText">Incidents</span>
                                <span className="metaDot">•</span>
                                <span className="metaText">Create or edit incident</span>
                            </div>
                        </div>
                    </div>

                    <div className="assetHeader__right">
                        <div className="auditMeta">
                            <div className="auditRow">
                                <span className="auditLabel">Org ID</span>
                                <span className="auditValue">{org?._id || orgId}</span>
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

                {/* BODY */}
                <main className="assetGrid">
                    <section className="panel">
                        <div className="panel__title">Incident Information</div>
                        <div className="tabBar" style={{ background: 'transparent', borderRadius: 12, padding: 0, marginBottom: 18, gap: 10 }}>
                            <button
                                className={`btn-electric btnGhost tabBtn${activeTab === "details" ? " active" : ""}`}
                                style={{
                                    borderRadius: 8,
                                    background: activeTab === "details" ? 'var(--primary, #5b4bd6)' : '#f6f7fb',
                                    color: activeTab === "details" ? '#fff' : 'var(--muted, #64748b)',
                                    fontWeight: 700,
                                    boxShadow: activeTab === "details" ? '0 2px 8px rgba(91,75,214,0.10)' : 'none',
                                    border: 'none',
                                    padding: '10px 28px',
                                    fontSize: 16,
                                    transition: 'background 0.15s, color 0.15s',
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setActiveTab("details")}
                            >
                                <span>Details</span>
                            </button>
                            <button
                                className={`btn-electric btnGhost tabBtn${activeTab === "corrective" ? " active" : ""}`}
                                style={{
                                    borderRadius: 8,
                                    background: activeTab === "corrective" ? 'var(--primary, #5b4bd6)' : '#f6f7fb',
                                    color: activeTab === "corrective" ? '#fff' : 'var(--muted, #64748b)',
                                    fontWeight: 700,
                                    boxShadow: activeTab === "corrective" ? '0 2px 8px rgba(91,75,214,0.10)' : 'none',
                                    border: 'none',
                                    padding: '10px 28px',
                                    fontSize: 16,
                                    transition: 'background 0.15s, color 0.15s',
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setActiveTab("corrective")}
                            >
                                <span>Corrective Action</span>
                            </button>
                        </div>
                        <div className="tabPanel">
                            {activeTab === "details" && (
                                <div className="fieldGrid">
                                    <div className="field">
                                        <div className="label">Misconduct</div>
                                        <select className="value" value={form.misconduct} onChange={e => setField("misconduct", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            {MISCONDUCT_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <div className="label">Name</div>
                                        <select className="value" value={form.name} onChange={e => setField("name", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            {people.map(p => (
                                                <option key={p.email} value={p.email}>{p.displayName || `${p.firstName || ""} ${p.lastName || ""}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <div className="label">Raised By</div>
                                        <select className="value" value={form.raisedBy} onChange={e => setField("raisedBy", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            {people.map(p => (
                                                <option key={p.email} value={p.email}>{p.displayName || `${p.firstName || ""} ${p.lastName || ""}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <div className="label">Recipient</div>
                                        <select className="value" value={form.recipient} onChange={e => setField("recipient", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            {people.map(p => (
                                                <option key={p.email} value={p.email}>{p.displayName || `${p.firstName || ""} ${p.lastName || ""}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <Zbot_Fields
                                            label="Date Reported"
                                            type="date"
                                            value={form.dateReported}
                                            onChange={e => setField("dateReported", e.target.value)}
                                            className="value"
                                        />
                                    </div>
                                    <div className="field">
                                        <Zbot_Fields
                                            label="Incident Date"
                                            type="date"
                                            value={form.incidentDate}
                                            onChange={e => setField("incidentDate", e.target.value)}
                                            className="value"
                                        />
                                    </div>
                                    <div className="field">
                                        <div className="label">Witness 1</div>
                                        <select className="value" value={form.witness1} onChange={e => setField("witness1", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            {people.map(p => (
                                                <option key={p.email} value={p.email}>{p.displayName || `${p.firstName || ""} ${p.lastName || ""}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field fieldFull">
                                        <Zbot_Fields
                                            label="Description"
                                            value={form.description}
                                            onChange={e => setField("description", e.target.value)}
                                            placeholder="Describe the incident..."
                                            className="value"
                                            multiline
                                            rows={3}
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                </div>
                            )}
                            {activeTab === "corrective" && (
                                <div className="fieldGrid">
                                    <div className="field">
                                        <div className="label">Behavioural Cause Analysis</div>
                                        <select className="value" value={form.behaviouralCause || ""} onChange={e => setField("behaviouralCause", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            <option value="Abet">Abet</option>
                                            <option value="Boredom">Boredom</option>
                                            <option value="Clinic Visit">Clinic Visit</option>
                                            <option value="Crime">Crime</option>
                                            <option value="Death">Death</option>
                                            <option value="Divorce">Divorce</option>
                                            <option value="Domestic">Domestic</option>
                                            <option value="Financial">Financial</option>
                                            <option value="General Wellbeing">General Wellbeing</option>
                                            <option value="Improper Attitude">Improper Attitude</option>
                                            <option value="Lack of Concentration">Lack of Concentration</option>
                                            <option value="Lack of Motivation">Lack of Motivation</option>
                                            <option value="Monotony">Monotony</option>
                                            <option value="Peer Pressure">Peer Pressure</option>
                                            <option value="Personality Clash">Personality Clash</option>
                                            <option value="Public Transport">Public Transport</option>
                                            <option value="Recklessness">Recklessness</option>
                                            <option value="Sabotage">Sabotage</option>
                                            <option value="Social Responsibility">Social Responsibility</option>
                                            <option value="Stress">Stress</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <div className="label">Corrective Action</div>
                                        <select className="value" value={form.correctiveAction || ""} onChange={e => setField("correctiveAction", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            <option value="Anger Management">Anger Management</option>
                                            <option value="Counselling">Counselling</option>
                                            <option value="Dismissal">Dismissal</option>
                                            <option value="Final Warning">Final Warning</option>
                                            <option value="Re Train">Re Train</option>
                                            <option value="Redeployment">Redeployment</option>
                                            <option value="Stress Management">Stress Management</option>
                                            <option value="Supervision">Supervision</option>
                                            <option value="Time Management">Time Management</option>
                                            <option value="Training">Training</option>
                                            <option value="Verbal Warning">Verbal Warning</option>
                                            <option value="Written Warning">Written Warning</option>
                                        </select>
                                    </div>
                                    <div className="fieldFull">
                                        <Zbot_Fields
                                            label="Recommended Actions"
                                            value={form.recommendedActions || ""}
                                            onChange={e => setField("recommendedActions", e.target.value)}
                                            className="value"
                                        />
                                    </div>
                                    <div className="field">
                                        <div className="label">Responsible Person</div>
                                        <select className="value" value={form.responsiblePerson || ""} onChange={e => setField("responsiblePerson", e.target.value)}>
                                            <option value="">-- Select --</option>
                                            {people.map(p => (
                                                <option key={p.email} value={p.email}>
                                                    {p.displayName || `${p.firstName || ""} ${p.lastName || ""}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <Zbot_Fields
                                            label="Due Date"
                                            type="date"
                                            value={form.dueDate || ""}
                                            onChange={e => setField("dueDate", e.target.value)}
                                            className="value"
                                        />
                                    </div>
                                    <div className="field">
                                        <Zbot_Fields
                                            label="Completed Date"
                                            type="date"
                                            value={form.completedDate || ""}
                                            onChange={e => setField("completedDate", e.target.value)}
                                            className="value"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                    <aside className="panel panelSticky">
                        <div className="panel__title">Quick Summary</div>
                        <div className="sideBlocks">
                            <div className="sideBlock">
                                <div className="sideBlock__title">Status</div>
                                <div className="sideBlock__text">{form.misconduct ? "Draft" : "New"}</div>
                            </div>
                            <div className="sideBlock">
                                <div className="sideBlock__title">Summary</div>
                                <div className="sideBlock__text">
                                    <div><b>Misconduct:</b> {form.misconduct || "—"}</div>
                                    <div><b>Name:</b> {people.find(p => p.email === form.name)?.displayName || "—"}</div>
                                    <div><b>Date Reported:</b> {form.dateReported || "—"}</div>
                                </div>
                            </div>
                            <div className="actionBlock">
                                <div className="actionBlock__buttons">
                                    <button
                                        className="btn-electric btnPrimary"
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving || !isAllFieldsValid()}
                                    >
                                        <span>{saving ? "Saving..." : "Save Incident"}</span>
                                    </button>
                                </div>
                                {err && <div style={{ color: "#b42318", margin: "10px 0", fontWeight: 800 }}>{err}</div>}
                                {success && <div style={{ color: "#15803d", margin: "10px 0", fontWeight: 700 }}>{success}</div>}
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
}
