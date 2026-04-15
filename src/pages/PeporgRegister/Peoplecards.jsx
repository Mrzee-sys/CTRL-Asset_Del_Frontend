import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DetailsLayout from "../DetailsLayout";
import { listPeople, createPerson, updatePerson } from "../../data/People/People.Repository";
import {
    listQualifications,
    createQualification,
    updateQualification,
    deleteQualification
} from "../../data/Qualifications/Qualifications.Repository";

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
            try {
                const { rows } = await listPeople({ orgId: id, limit: 1000 });
                let loadedPerson = null;

                if (isNewPerson) {
                    loadedPerson = {
                        firstName: "", lastName: "", email: "", status: "Active",
                        phone: "", employeeType: "", classification: "", staffLevel: "",
                        gender: "", age: "", idNumber: "", passport: "",
                        dateJoined: new Date().toISOString()
                    };
                } else if (statePerson) {
                    loadedPerson = statePerson;
                } else {
                    loadedPerson = rows.find(p => (p.email || "").trim().toLowerCase() === requestedEmail);
                }

                if (loadedPerson && alive) {
                    // ✅ PRO TIP: Map DB keys (phone/employeeType) to UI state keys
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
                    setEditMode(isNewPerson);
                }
            } catch (e) {
                if (alive) setErr(e?.message || "Failed to load.");
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, [id, location.state, requestedEmail, isNewPerson]);

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
        { label: "Manager", key: "manager" }
    ];

    // --- Handlers ---
    function savePersonField(key, value) {
        setPerson(prev => ({ ...prev, [key]: value }));
    }

    async function savePersonUpdates() {
        setSaving(true); 
        setSaveStatus("");
        try {
            // ✅ PRO TIP: Map UI keys back to DB keys before saving
            const payload = {
                ...person,
                orgId: id,
                dateJoined: draftDateJoined ? new Date(draftDateJoined).toISOString() : person.dateJoined,
                addressLine1: draftAddressLine1,
                complexName: draftComplexName,
                city: draftCity,
                state: draftState,
                postalCode: draftPostalCode,
                country: draftCountry,
                phone: String(person?.contactNumber || ""), // Map back to DB 'phone'
                employeeType: person?.employmentStatus || "", // Map back to DB 'employeeType'
                age: Number(person?.age) || 0
            };

            console.log('TRANSFORMED PAYLOAD:', payload);

            let result;
            if (isNewPerson) {
                result = await createPerson(payload);
            } else {
                const pid = person.id || person._id;
                result = await updatePerson(pid, payload);
            }

            // ✅ THE FIX: Re-map DB keys to UI keys after save so fields stay populated
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
                <div className="sideBlock__title">ACTIONS</div>
                <div className="actionBlock__buttons">
                    <button className="btn btnPrimary" onClick={() => setEditMode(!editMode)}>
                        {editMode ? "Cancel Editing" : "Edit Details"}
                    </button>
                    {editMode && (
                        <button className="btn btnPrimary" onClick={savePersonUpdates} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    )}
                    <button className="btn btnGhost" onClick={() => navigate(`/peporg/${id}`)}>Back to Org</button>
                </div>
                {saveStatus && <div style={{color: '#10b981', marginTop: 10, fontWeight: 700}}>{saveStatus}</div>}
                {err && <div style={{color: '#ff3b47', marginTop: 10, fontSize: 13}}>{err}</div>}
            </div>
        </div>
    );

    return (
        <DetailsLayout
            title={person ? `${person.firstName} ${person.lastName}` : "Loading..."}
            subtitle="Person Detail View"
            pillText="PEOPLE"
            sidebarContent={sidebar}
        >
            <div className="tabBarContainer" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {["details", "address", "qualifications"].map(tab => (
                    <button
                        key={tab}
                        className={`btn ${activeTab === tab ? "btnPrimary" : "btnGhost"}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

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
                                ) : (
                                    <input type={f.type || "text"} className="value" value={person?.[f.key] || ""} onChange={e => savePersonField(f.key, e.target.value)} />
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
                        <input className="value" disabled={!editMode} value={draftAddressLine1} onChange={e => setDraftAddressLine1(e.target.value)} />
                    </div>
                    <div className="field"><label className="label">City</label>
                        <input className="value" disabled={!editMode} value={draftCity} onChange={e => setDraftCity(e.target.value)} />
                    </div>
                    <div className="field"><label className="label">Postal Code</label>
                        <input className="value" disabled={!editMode} value={draftPostalCode} onChange={e => setDraftPostalCode(e.target.value)} />
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
                                    <input className="value" value={qName} onChange={e => setQName(e.target.value)} />
                                </div>
                                <div className="field"><label className="label">Obtained</label>
                                    <input type="date" className="value" value={qObtained} onChange={e => setQObtained(e.target.value)} />
                                </div>
                                <div className="field"><label className="label">Renewal</label>
                                    <input type="date" className="value" value={qRenewal} onChange={e => setQRenewal(e.target.value)} />
                                </div>
                            </div>
                            <button className="btn btnPrimary" onClick={addQualification}>Add Qualification</button>
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
                                    {editMode && <td><button className="btn btnGhost" onClick={() => removeQualification(i)}>Remove</button></td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DetailsLayout>
    );
}