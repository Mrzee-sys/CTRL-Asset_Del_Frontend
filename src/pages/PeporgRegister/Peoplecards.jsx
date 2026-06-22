import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DetailsLayout from "../DetailsLayout";
import Zbot_Fields from "../../components/Zbot_Fields";
import { listPeople, createPerson, updatePerson } from "../../data/People/People.Repository";
import {
    listQualifications,
    createQualification,
    updateQualification,
    deleteQualification
} from "../../data/Qualifications/Qualifications.Repository";
import { getMedicalHistory, createMedicalRecord } from "../../data/MedicalHist/MedHist.Repository";

// --- Helpers ---

function getMonthsUntil(dateString) {
    if (!dateString) return null;
    const now = new Date();
    const renewal = new Date(dateString);
    if (isNaN(renewal.getTime())) return null;
    const months = (renewal.getFullYear() - now.getFullYear()) * 12 + (renewal.getMonth() - now.getMonth());
    if (months < 0 || (months === 0 && renewal < now)) return 'Expired';
    return months === 0 ? 'Expires this month' : `${months} month${months !== 1 ? 's' : ''} left`;
}

function calculateService(dateString) {
    if (!dateString) return "—";
    const joined = new Date(dateString);
    if (isNaN(joined.getTime())) return "—";
    const now = new Date();
    let years = now.getFullYear() - joined.getFullYear();
    let months = now.getMonth() - joined.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }
    return `${years}y ${months}m`;
}

export default function Peoplecards() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id, email } = useParams();

    // ✅ Safely trim the ID 
    const cleanId = id ? String(id).trim() : "";

    const [person, setPerson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState("details");
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState("");
    
    // Draft states for Address & Service
    const [draftAddressLine1, setDraftAddressLine1] = useState("");
    const [draftComplexName, setDraftComplexName] = useState("");
    const [draftCity, setDraftCity] = useState("");
    const [draftState, setDraftState] = useState("");
    const [draftPostalCode, setDraftPostalCode] = useState("");
    const [draftCountry, setDraftCountry] = useState("");
    const [draftDateJoined, setDraftDateJoined] = useState("");

    // Draft states for Qualifications
    const [qName, setQName] = useState("");
    const [qObtained, setQObtained] = useState("");
    const [qRenewal, setQRenewal] = useState("");
    const [qualifications, setQualifications] = useState([]);
    const [qualLoading, setQualLoading] = useState(false);

    // Medical history state
    const [medRecords, setMedRecords] = useState([]);
    const [medLoading, setMedLoading] = useState(false);
    const [medForm, setMedForm] = useState({ last_medical_date: '', medical_type: '', expiry_date: '', fitness_status: '' });
    const [medSaving, setMedSaving] = useState(false);
    const [medError, setMedError] = useState('');
   
    // Organization people state for manager dropdown
    const [orgPeople, setOrgPeople] = useState([]);

    const requestedEmail = useMemo(() => {
        try {
            return decodeURIComponent(email || '').trim().toLowerCase();
        } catch {
            return (email || '').trim().toLowerCase();
        }
    }, [email]);

    const isNewPerson = requestedEmail === "new";

    // --- Data Loading ---
    useEffect(() => {
        let alive = true;
        const statePerson = location.state?.person;

        async function load() {
            setLoading(true);
            setErr("");
            
            // ✅ THE FIX: Set blank person immediately so the UI doesn't render "undefined undefined"
            if (isNewPerson) {
                setPerson({
                    firstName: "", lastName: "", email: "", status: "Active",
                    phone: "", employeeType: "", classification: "", staffLevel: "",
                    gender: "", age: "", idNumber: "", passport: "",
                    dateJoined: new Date().toISOString()
                });
                setEditMode(true);
            } else if (statePerson) {
                setPerson({
                    ...statePerson,
                    contactNumber: statePerson.phone || "",
                    employmentStatus: statePerson.employeeType || "",
                });
            }

            try {
                // Fetch people to populate the manager dropdown
                const { rows } = await listPeople({ orgId: cleanId, limit: 1000 });
                if (alive) setOrgPeople(rows || []);

                // If not new and no state person, find them in the DB
                if (!isNewPerson && !statePerson && alive) {
                    const loadedPerson = rows.find(p => (p.email || "").trim().toLowerCase() === requestedEmail);
                    if (loadedPerson) {
                        setPerson({
                            ...loadedPerson,
                            contactNumber: loadedPerson.phone || "",
                            employmentStatus: loadedPerson.employeeType || "",
                            classification: loadedPerson.classification || "",
                            staffLevel: loadedPerson.staffLevel || "",
                            gender: loadedPerson.gender || "",
                            age: loadedPerson.age || "",
                            idNumber: loadedPerson.idNumber || "",
                            passport: loadedPerson.passport || ""
                        });
                    } else {
                        setErr("Person not found in this organisation.");
                    }
                }
            } catch (e) {
                // Catch backend 400 errors silently so they don't break the page
                if (alive) setErr(e?.message || "Failed to load organisation data.");
            } finally {
                if (alive) setLoading(false);
            }
        }
        if (cleanId) load();
        return () => { alive = false; };
    }, [cleanId, location.state, requestedEmail, isNewPerson]);

    // Qualifications Effect
    useEffect(() => {
        const pId = person?.id || person?._id;
        if (!pId) {
            setQualifications([]);
            return;
        }

        let alive = true;
        setQualLoading(true);
        listQualifications({ personId: pId })
            .then(qs => { if (alive) setQualifications(qs); })
            .catch(() => { if (alive) setQualifications([]); })
            .finally(() => { if (alive) setQualLoading(false); });
        return () => { alive = false; };
    }, [person?.id, person?._id]);

    // Medical history effect
    useEffect(() => {
        const pId = person?.id || person?._id;
        if (!pId) {
            setMedRecords([]);
            return;
        }

        let alive = true;
        setMedLoading(true);
        getMedicalHistory(pId)
            .then(records => { if (alive) setMedRecords(records); })
            .catch(() => { if (alive) setMedRecords([]); })
            .finally(() => { if (alive) setMedLoading(false); });
        return () => { alive = false; };
    }, [person?.id, person?._id]);

    useEffect(() => {
        if (person) {
            setDraftAddressLine1(person.addressLine1 || "");
            setDraftComplexName(person.complexName || "");
            setDraftCity(person.city || "");
            setDraftState(person.state || "");
            setDraftPostalCode(person.postalCode || "");
            setDraftCountry(person.country || "");
            const joined = person.dateJoined ? new Date(person.dateJoined) : null;
            setDraftDateJoined(joined && !isNaN(joined.getTime()) ? joined.toISOString().slice(0, 10) : "");
        }
    }, [person]);

    // --- Configuration ---
    const fields = [
        { label: "Title", key: "title", type: "select", options: ["", "Mr", "Mrs", "Miss", "Ms", "Dr", "Prof"] },
        { label: "First Name", key: "firstName" },
        { label: "Last Name", key: "lastName" },
        { label: "ID Number", key: "idNumber" },
        { label: "Passport Number", key: "passport" },
        { label: "Gender", key: "gender", type: "select", options: ["", "Male", "Female", "Non-Binary", "Other"] },
        { label: "Age", key: "age", type: "number" },
        { label: "Contact Number", key: "contactNumber" },
        { label: "Employment Status", key: "employmentStatus", type: "select", options: ["", "Contractor", "Permanent", "Freelancer", "Temp Hire", "Intern"] },
        { label: "Classification", key: "classification", type: "select", options: ["", "African", "Coloured", "Indian", "White", "Other"] },
        { label: "Staff Level", key: "staffLevel", type: "select", options: ["", "P1 - Associate", "P2 - Professional", "P3 - Senior", "P4 - Lead", "M1 - Team Lead", "M2 - Manager", "M3 - Director", "E1 - VP", "E2 - Executive"] },
        { label: "Company", key: "company" },
        { label: "Email", key: "email" },
        { label: "Department", key: "department" },
        { label: "Status", key: "status", type: "select", options: ["", "Active", "Terminated", "Long Leave"] },
           { label: "Manager", key: "manager", type: "manager" }
    ];

    // --- Handlers ---
    function savePersonField(key, value) {
        setPerson(prev => ({ ...prev, [key]: value }));
    }

    async function savePersonUpdates() {
        setSaving(true); 
        setSaveStatus("");
        try {
            const payload = {
                ...person,
                orgId: cleanId, // ✅ Use cleanId for saving!
                dateJoined: draftDateJoined ? new Date(draftDateJoined).toISOString() : person.dateJoined,
                addressLine1: draftAddressLine1,
                complexName: draftComplexName,
                city: draftCity,
                state: draftState,
                postalCode: draftPostalCode,
                country: draftCountry,
                phone: String(person?.contactNumber || ""), 
                employeeType: person?.employmentStatus || "", 
                age: Number(person?.age) || 0
            };

            let result;
            if (isNewPerson) {
                result = await createPerson(payload);
                const identifier = result.email || result.id || result._id;
                navigate(`/peporg/${encodeURIComponent(cleanId)}/people/${encodeURIComponent(identifier)}`, { replace: true });
            } else {
                const pid = person.id || person._id;
                result = await updatePerson(pid, payload);
            }

            const remapped = {
                ...result,
                contactNumber: result.phone || "",
                employmentStatus: result.employeeType || ""
            };

            setPerson(remapped);
            setSaveStatus("Saved successfully.");
            setEditMode(false);
        } catch (e) {
            setErr(e.message);
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus(""), 3000);
        }
    }

    const addQualification = async () => {
        const pId = person?.id || person?._id;
        if (!qName || !pId) return;
        const newQ = { name: qName, obtained: qObtained, renewal: qRenewal, personId: pId };
        try {
            const created = await createQualification(newQ);
            setQualifications(prev => [...prev, created]);
            setQName(""); setQObtained(""); setQRenewal("");
        } catch (e) { console.error(e); }
    };

    const removeQualification = async (index) => {
        const q = qualifications[index];
        if (!q?.id && !q?._id) return;
        try {
            await deleteQualification(q.id || q._id);
            setQualifications(prev => prev.filter((_, i) => i !== index));
        } catch (e) { console.error(e); }
    };

    const medicalToday = new Date("2026-04-23T00:00:00");
    const medicalHistory = medRecords;
    const medicalTotalCount = medicalHistory.length;
    const medicalExpiredCount = medicalHistory.filter((record) => {
        const expiry = record?.expiry_date ? new Date(record.expiry_date) : null;
        return expiry && !isNaN(expiry.getTime()) && expiry < medicalToday;
    }).length;
    const medicalValidCount = medicalHistory.filter((record) => {
        const expiry = record?.expiry_date ? new Date(record.expiry_date) : null;
        return expiry && !isNaN(expiry.getTime()) && expiry >= medicalToday;
    }).length;

    // --- Layout ---
    const sidebar = (
        <div className="sideBlocks">
            <div className="sideBlock">
                <div className="sideBlock__title">SERVICE SUMMARY</div>
                <div className="sideBlock__row">
                    <span>Started:</span>
                    <span style={{ fontWeight: 600 }}>{draftDateJoined || "—"}</span>
                </div>
                <div className="sideBlock__row">
                    <span>Service:</span>
                    <span style={{ fontWeight: 600 }}>{calculateService(draftDateJoined)}</span>
                </div>
            </div>

            <div className="sideBlock">
                <div className="sideBlock__title">QUALIFICATIONS</div>
                <ul className="sideBlock__list">
                    {qualLoading ? (
                        <li>Loading...</li>
                    ) : qualifications.length > 0 ? (
                        qualifications.map((q, i) => {
                            const months = getMonthsUntil(q.renewal);
                            return (
                                <li key={q.id || q._id || i}>
                                    {q.name}
                                    {q.renewal && (
                                        <span style={{ color: months === 'Expired' ? '#ff3b47' : '#888', fontSize: 13, marginLeft: 6 }}>
                                            ({months})
                                        </span>
                                    )}
                                </li>
                            );
                        })
                    ) : (
                        <li style={{ color: '#999' }}>No qualifications added</li>
                    )}
                </ul>
            </div>

            <div className="sideBlock">
                <div className="sideBlock__title">MEDICAL SURVEILLANCE</div>
                <ul className="sideBlock__list">
                    {medLoading ? (
                        <li>Loading...</li>
                    ) : (
                        <>
                            <li>Total Medicals: {medicalTotalCount}</li>
                            <li style={{ color: medicalExpiredCount > 0 ? '#ff3b47' : undefined }}>
                                Expired: {medicalExpiredCount}
                            </li>
                            <li>Valid: {medicalValidCount}</li>
                        </>
                    )}
                </ul>
            </div>

            <div className="sideBlock">
                <div className="sideBlock__title">ACTIONS</div>
                <div className="actionBlock__buttons">
                    <button className="btn-electric btnPrimary" onClick={() => setEditMode(!editMode)}>
                        <span>{editMode ? "Cancel Editing" : "Edit Details"}</span>
                    </button>
                    {editMode && (
                        <button className="btn-electric btnPrimary" onClick={savePersonUpdates} disabled={saving}>
                            <span>{saving ? "Saving..." : "Save Changes"}</span>
                        </button>
                    )}
                    <button className="btn-electric btnGhost" onClick={() => navigate(`/peporg/${encodeURIComponent(cleanId)}`)}><span>Back to Org</span></button>
                </div>
                {saveStatus && <div style={{color: '#10b981', marginTop: 10, fontWeight: 700}}>{saveStatus}</div>}
                {err && <div style={{color: '#ff3b47', marginTop: 10, fontSize: 13}}>{err}</div>}
            </div>
        </div>
    );

    // ✅ THE FIX: Safely parse the title so "undefined undefined" never happens
    const pageTitle = isNewPerson 
        ? "New Person" 
        : person 
            ? `${person.firstName || ''} ${person.lastName || ''}`.trim() || "Unnamed Person"
            : "Loading...";

    return (
        <DetailsLayout
            title={pageTitle}
            subtitle="Person Detail View"
            pillText="PEOPLE"
            sidebarContent={sidebar}
        >
            <style>{`
                .people-card-body {
                    max-height: 65vh !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    padding-right: 12px;
                }
                .people-card-body .fieldGrid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    align-items: center;
                }
                .people-card-body .field {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }
                .people-card-body .field.fieldFull {
                    grid-column: 1 / -1;
                }
                .people-card-body .field .label,
                .people-card-body .field .value,
                .people-card-body .field .value.readonly {
                    min-width: 0;
                }
                .people-card-body .field .value.readonly {
                    word-break: break-word;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .people-card-body::-webkit-scrollbar {
                    width: 6px;
                }
                .people-card-body::-webkit-scrollbar-track {
                    background: transparent;
                }
                .people-card-body::-webkit-scrollbar-thumb {
                    background: rgba(0, 255, 255, 0.3);
                    border-radius: 10px;
                }
                .people-card-body::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 255, 255, 0.6);
                }
            `}</style>

            <div className="tabBarContainer" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {["details", "address", "qualifications", "medicals"].map(tab => {
                    const isLocked = isNewPerson && (tab === "qualifications" || tab === "medicals");
                    
                    return (
                        <button
                            key={tab}
                            className={`btn-electric ${activeTab === tab ? "btnPrimary" : "btnGhost"}`}
                            onClick={() => {
                                if (isLocked) {
                                    alert(`Please save the person's details first before adding ${tab}.`);
                                    return;
                                }
                                setActiveTab(tab);
                            }}
                            style={{ opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : "pointer", textTransform: 'capitalize', fontWeight: 600, fontSize: 16 }}
                            title={isLocked ? "Save person first" : ""}
                        >
                            {tab}
                            {isLocked && " 🔒"}
                        </button>
                    );
                })}
            </div>

            <div className="people-card-body">
                {activeTab === "details" && (
                    <div className="fieldGrid">
                        {fields.map(f => (
                            <div key={f.label} className="field">
                                <label className="label">{f.label}</label>
                                {editMode ? (
                                    f.type === "select" ? (
                                        <select className="value" value={person?.[f.key] || ""} onChange={e => savePersonField(f.key, e.target.value)}>
                                            {f.options.map(o => <option key={o} value={o}>{o || "Select..."}</option>)}
                                        </select>
                                    ) : f.type === "manager" ? (
                                        <select className="value" value={person?.[f.key] || ""} onChange={e => savePersonField(f.key, e.target.value)}>
                                            <option value="">Unassigned</option>
                                            {orgPeople
                                                .filter(p => {
                                                    const staffLevel = p.staffLevel || "";
                                                    return staffLevel.includes("M1") || staffLevel.includes("M2") || staffLevel.includes("M3") || staffLevel.includes("E1") || staffLevel.includes("E2");
                                                })
                                                .map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.firstName} {p.lastName}</option>)}
                                        </select>
                                    ) : (
                                        <Zbot_Fields
                                            type={f.type || "text"}
                                            className="value"
                                            value={person?.[f.key] || ""}
                                            onChange={e => savePersonField(f.key, e.target.value)}
                                            label={f.label}
                                            name={f.key}
                                        />
                                    )
                                ) : (
                                    <div className="value readonly">{person?.[f.key] || "—"}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "address" && (
                    <div className="fieldGrid">
                        <div className="field fieldFull"><label className="label">Address Line 1</label>
                            <Zbot_Fields className="value" disabled={!editMode} value={draftAddressLine1} onChange={e => setDraftAddressLine1(e.target.value)} label="Address Line 1" name="addressLine1" />
                        </div>
                        <div className="field"><label className="label">City</label>
                            <Zbot_Fields className="value" disabled={!editMode} value={draftCity} onChange={e => setDraftCity(e.target.value)} label="City" name="city" />
                        </div>
                        <div className="field"><label className="label">Postal Code</label>
                            <Zbot_Fields className="value" disabled={!editMode} value={draftPostalCode} onChange={e => setDraftPostalCode(e.target.value)} label="Postal Code" name="postalCode" />
                        </div>
                    </div>
                )}

                {activeTab === "qualifications" && (
                    <div className="qualSection">
                        {editMode && (
                            <div className="qualForm sideBlock" style={{marginBottom: 20}}>
                                <div className="sideBlock__title">Add Qualification</div>
                                <div className="fieldGrid">
                                    <div className="field"><label className="label">Name</label>
                                        <Zbot_Fields className="value" value={qName} onChange={e => setQName(e.target.value)} label="Qualification Name" name="qualificationName" />
                                    </div>
                                    <div className="field"><label className="label">Obtained</label>
                                        <Zbot_Fields type="date" className="value" value={qObtained} onChange={e => setQObtained(e.target.value)} label="Obtained" name="obtained" />
                                    </div>
                                    <div className="field"><label className="label">Renewal</label>
                                        <Zbot_Fields type="date" className="value" value={qRenewal} onChange={e => setQRenewal(e.target.value)} label="Renewal" name="renewal" />
                                    </div>
                                </div>
                                <button className="btn-electric btnPrimary" onClick={addQualification}><span>Add Qualification</span></button>
                            </div>
                        )}
                        <table className="registerTable">
                            <thead>
                                <tr><th>Name</th><th>Obtained</th><th>Renewal</th>{editMode && <th>Action</th>}</tr>
                            </thead>
                            <tbody>
                                {qualifications.map((q, i) => (
                                    <tr key={q.id || q._id || i}>
                                        <td>{q.name}</td><td>{q.obtained}</td><td>{q.renewal}</td>
                                        {editMode && <td><button className="btn-electric btnGhost" onClick={() => removeQualification(i)}><span>Remove</span></button></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "medicals" && (
                    <div className="qualSection">
                        {editMode && (
                            <div className="qualForm sideBlock" style={{ marginBottom: 20 }}>
                                <div className="sideBlock__title">Add Medical Record</div>
                                <div className="fieldGrid">
                                    <div className="field"><label className="label">Medical Type</label>
                                        <Zbot_Fields
                                            className="value"
                                            placeholder="e.g. Occupational Health"
                                            value={medForm.medical_type}
                                            onChange={e => setMedForm(f => ({ ...f, medical_type: e.target.value }))}
                                            label="Medical Type"
                                            name="medical_type"
                                        />
                                    </div>
                                    <div className="field"><label className="label">Last Medical Date</label>
                                        <Zbot_Fields
                                            type="date"
                                            className="value"
                                            value={medForm.last_medical_date}
                                            onChange={e => setMedForm(f => ({ ...f, last_medical_date: e.target.value }))}
                                            label="Last Medical Date"
                                            name="last_medical_date"
                                        />
                                    </div>
                                    <div className="field"><label className="label">Expiry Date</label>
                                        <Zbot_Fields
                                            type="date"
                                            className="value"
                                            value={medForm.expiry_date}
                                            onChange={e => setMedForm(f => ({ ...f, expiry_date: e.target.value }))}
                                            label="Expiry Date"
                                            name="expiry_date"
                                        />
                                    </div>
                                    <div className="field"><label className="label">Fitness Status</label>
                                        <select
                                            className="value"
                                            value={medForm.fitness_status}
                                            onChange={e => setMedForm(f => ({ ...f, fitness_status: e.target.value }))}
                                        >
                                            <option value="">Select...</option>
                                            <option>Fit</option>
                                            <option>Fit with Restrictions</option>
                                            <option>Temporarily Unfit</option>
                                            <option>Unfit</option>
                                        </select>
                                    </div>
                                </div>
                                {medError && <div style={{ color: '#ff3b47', marginBottom: 8, fontSize: 13 }}>{medError}</div>}
                                <button
                                    className="btn-electric btnPrimary"
                                    disabled={medSaving}
                                    onClick={async () => {
                                        setMedError('');
                                        const pId = person?.id || person?._id;
                                        if (!medForm.medical_type || !medForm.last_medical_date) {
                                            setMedError('Medical Type and Last Medical Date are required.');
                                            return;
                                        }
                                        setMedSaving(true);
                                        try {
                                            const created = await createMedicalRecord({
                                                employee_id: pId,
                                                medical_type: medForm.medical_type,
                                                last_medical_date: medForm.last_medical_date,
                                                expiry_date: medForm.expiry_date || null,
                                                fitness_status: medForm.fitness_status,
                                            });
                                            setMedRecords(prev => [created, ...prev]);
                                            localStorage.setItem('medhist:lastUpdate', String(Date.now()));
                                            window.dispatchEvent(new Event('medhist-updated'));
                                            setMedForm({ last_medical_date: '', medical_type: '', expiry_date: '', fitness_status: '' });
                                        } catch (e) {
                                            setMedError(e.message);
                                        } finally {
                                            setMedSaving(false);
                                        }
                                    }}
                                >
                                    <span>{medSaving ? 'Saving...' : 'Save Medical Record'}</span>
                                </button>
                            </div>
                        )}
                        {medLoading ? (
                            <div style={{ color: '#b3e0ff' }}>Loading medical records...</div>
                        ) : (
                            <table className="registerTable">
                                <thead>
                                    <tr><th>Type</th><th>Last Medical</th><th>Expiry</th><th>Fitness Status</th><th>Document Ref</th></tr>
                                </thead>
                                <tbody>
                                    {medRecords.length === 0 ? (
                                        <tr><td colSpan={5} style={{ color: '#888', textAlign: 'center' }}>No medical records found</td></tr>
                                    ) : (
                                        medRecords.map((r, i) => (
                                            <tr key={r._id || r.id || i}>
                                                <td>{r.medical_type || '—'}</td>
                                                <td>{r.last_medical_date ? new Date(r.last_medical_date).toLocaleDateString() : '—'}</td>
                                                <td>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : '—'}</td>
                                                <td>{r.fitness_status || '—'}</td>
                                                <td style={{ fontSize: 12, wordBreak: 'break-all' }}>{r.document_ref || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </DetailsLayout>
    );
}