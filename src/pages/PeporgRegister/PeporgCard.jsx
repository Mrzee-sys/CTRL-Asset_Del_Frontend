import React, { useState, useRef, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { useNavigate, useParams, useLocation } from "react-router-dom"; // ✅ Merged Import
import { createOrg, fetchOrgById, updateOrg } from "./peporgApi";
import { fetchPeopleByOrg, createPerson } from "./peopleApi";
import PeopleTable from "./PeopleTable";
import DetailsLayout from "../DetailsLayout";
import "../../styles/DetailPageLayout.css";

const PeporgCard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const location = useLocation();
    
    // Helper: treat undefined or "new" as new org
    const isNewOrg = !id || id === "new";

    // --- State ---
    // Initializes from Dashboard state (Drill-downs)
    const [activeTab, setActiveTab] = useState(() => location.state?.initialTab || "details");
    const [peopleFilter, setPeopleFilter] = useState(location.state?.initialFilter || null);
    
    const [editMode, setEditMode] = useState(isNewOrg); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saveMsg, setSaveMsg] = useState("");
    const [peopleCount, setPeopleCount] = useState(0);
    const [peopleList, setPeopleList] = useState([]);
    const [savedOrg, setSavedOrg] = useState(null);

    const [form, setForm] = useState({
        orgName: "",
        tradingAs: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        contactNumber: "",
        vatTaxNumber: "",
        companyRegNumber: ""
    });

    // Derived: Check if ALL required fields are filled
    const isFormComplete = [
        form.orgName,
        form.contactNumber,
        form.vatTaxNumber,
        form.companyRegNumber,
        form.addressLine1,
        form.city,
        form.state
    ].every(v => typeof v === "string" && v.trim() !== "");

    // --- Effects ---
    useEffect(() => {
        if (!isNewOrg) {
            loadOrgData();
        }
    }, [id]);

    const loadOrgData = async () => {
        try {
            setLoading(true);
            const org = await fetchOrgById(id);
            setForm(org);
            setSavedOrg(org);

            const people = await fetchPeopleByOrg(id);
            setPeopleCount(people?.length || 0);
            setPeopleList(Array.isArray(people) ? people : []);
        } catch (err) {
            setError("Failed to load organisation data.");
        } finally {
            setLoading(false);
        }
    };

    // Employment type breakdown
    const employmentTypes = ["Contractor", "Permanent", "Freelancer", "Temp Hire", "Intern"];
    const employmentCounts = useMemo(() => {
        const counts = {};
        employmentTypes.forEach(type => { counts[type] = 0; });
        peopleList.forEach(p => {
            const t = (p.employeeType || "").trim();
            if (employmentTypes.includes(t)) counts[t]++;
        });
        return counts;
    }, [peopleList]);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = () => setEditMode(true);
    const handleBack = () => {
        if (isNewOrg) navigate(-1);
        setEditMode(false);
        if (savedOrg) setForm(savedOrg);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (!isNewOrg) {
                await updateOrg(id, form);
                setSaveMsg("Got it! Updated successfully.");
                setEditMode(false);
            } else {
                const newOrg = await createOrg(form);
                setSaveMsg("Got it! Created successfully.");
                
                const newRealId = newOrg?.id || newOrg?._id || newOrg?.orgId;
                if (newRealId) {
                    navigate(`/peporg/${newRealId}`, { replace: true });
                } else {
                    setEditMode(false);
                }
            }
        } catch (err) {
            setError("Error saving data.");
        } finally {
            setLoading(false);
            setTimeout(() => setSaveMsg(""), 3000);
        }
    };

    const handleImportPeople = () => fileInputRef.current?.click();
    
    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setError("");
        setSaveMsg("");
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    for (const row of results.data) {
                        const personData = { ...row, orgId: id };
                        await createPerson(personData);
                    }
                    setSaveMsg("Import successful!");
                    loadOrgData();
                } catch (err) {
                    setError(err?.message || "Import failed.");
                } finally {
                    e.target.value = null;
                }
            },
            error: (err) => {
                setError(err?.message || "Failed to parse CSV.");
                e.target.value = null;
            }
        });
    };

    const handleDownloadTemplate = () => {
        const headers = ["firstName", "lastName", "email", "employeeType", "employeeId", "department", "manager", "location", "staffLevel"];
        const csvContent = headers.join(",") + "\n";
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "people_import_template.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <DetailsLayout
            title={form.orgName || "Untitled Organisation"}
            subtitle={isNewOrg ? "New Organisation • Creating new record" : `Organisation • ID: ${id}`}
            statusPills={[{ text: isNewOrg ? "New" : "Active", className: "pillLive" }]}
            sidebarContent={
                <>
                    <div className="sideBlock">
                        <div className="sideBlock__title">Quick Summary</div>
                        {activeTab === "people" ? (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {employmentTypes.map(type => (
                                    <li key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 2 }}>
                                        <span>{type}</span>
                                        <span style={{ fontWeight: 700 }}>{employmentCounts[type]}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="summaryRow">
                                <span className="summaryLabel">Status</span>
                                <span className="pill pillLive">{isNewOrg ? "New" : "Active"}</span>
                            </div>
                        )}
                    </div>
                    <div className="sideBlock">
                        <div className="sideBlock__title">Registration Details</div>
                        <div className="summaryRow"><div className="summaryLabel">Contact</div><div className="summaryValue">{form.contactNumber || "—"}</div></div>
                        <div className="summaryRow"><div className="summaryLabel">VAT No.</div><div className="summaryValue">{form.vatTaxNumber || "—"}</div></div>
                    </div>
                    <div className="sideBlock">
                        <div className="sideBlock__title">People</div>
                        <div className="bigStat">{peopleCount}</div>
                    </div>
                    
                    <div className="actionBlock" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(!isNewOrg && !editMode) && (
                            <>
                                <button className="btn btnPrimary" onClick={handleImportPeople} type="button">Import People</button>
                                <input type="file" ref={fileInputRef} style={{display:'none'}} onChange={handleFileChange} />
                                <button className="btn btnGhost" onClick={handleDownloadTemplate} type="button">Download Template</button>
                                <button className="btn btnPrimary" onClick={() => navigate(`/peporg/${id}/people/new`)} type="button">Add Person</button>
                            </>
                        )}
                        
                        {editMode ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <button className="btn btnPrimary" onClick={handleSubmit} disabled={loading || !isFormComplete}>
                                    {loading ? "Saving..." : "Save"}
                                </button>
                                <button className="btn btnGhost" onClick={handleBack}>Cancel</button>
                            </div>
                        ) : (
                            <button className="btn btnPrimary" onClick={handleEdit}>Edit Organisation</button>
                        )}
                        {saveMsg && <div className="saveFeedback">{saveMsg}</div>}
                    </div>
                </>
            }
        >
            {/* ===== TABS ===== */}
            <div className="tabBarContainer" style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 2, marginBottom: 18 }}>
                {["details", "people", "leadership"].map(tab => (
                    <button
                        key={tab}
                        className={`btn ${activeTab === tab ? "btnPrimary" : "btnGhost"}`}
                        onClick={() => setActiveTab(tab)}
                        style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: 16 }}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            
            <div style={{ marginTop: 24 }}>
                {activeTab === "details" ? (
                    <form id="peporg-form" autoComplete="off">
                        <div className="panel__title">Organisation Details</div>
                        {error && <div className="errorText">{error}</div>}
                        <div className="fieldGrid">
                            <div className="field"><label className="label">Organisation Name</label><input className="value" name="orgName" value={form.orgName} onChange={handleChange} disabled={!editMode} required /></div>
                            <div className="field"><label className="label">Trading As</label><input className="value" name="tradingAs" value={form.tradingAs} onChange={handleChange} disabled={!editMode} /></div>
                            {editMode && (
                                <>
                                    <div className="field"><label className="label">Contact Number</label><input className="value" name="contactNumber" value={form.contactNumber} onChange={handleChange} disabled={!editMode} /></div>
                                    <div className="field"><label className="label">Company Registration Number</label><input className="value" name="companyRegNumber" value={form.companyRegNumber} onChange={handleChange} disabled={!editMode} /></div>
                                    <div className="field"><label className="label">VAT Number</label><input className="value" name="vatTaxNumber" value={form.vatTaxNumber} onChange={handleChange} disabled={!editMode} /></div>
                                </>
                            )}
                        </div>
                        <div className="field fieldFull">
                            <label className="label">Address</label>
                            <div className="addressStack">
                                <input className="value" name="addressLine1" placeholder="Line 1" value={form.addressLine1} onChange={handleChange} disabled={!editMode} style={{ marginBottom: 10 }} />
                                <input className="value" name="city" placeholder="City" value={form.city} onChange={handleChange} disabled={!editMode} style={{ marginBottom: 10 }} />
                                <input className="value" name="state" placeholder="State" value={form.state} onChange={handleChange} disabled={!editMode} />
                            </div>
                        </div>
                    </form>
                ) : activeTab === "leadership" ? (
                    <div className="panel">
                        <div className="panel__title">Leadership View</div>
                        <div className="registerTableWrap">
                            <table className="registerTable">
                                <thead><tr><th>Name</th><th>Staff Level</th><th>Department</th><th>Manager</th><th>Email</th></tr></thead>
                                <tbody>
                                    {peopleList
                                        .filter(p => {
                                            const sl = (p.staffLevel || "").toUpperCase();
                                            return sl.startsWith("M") || sl.startsWith("E") || sl.startsWith("P4");
                                        })
                                        .sort((a, b) => {
                                            const rank = sl => {
                                                const s = (sl || "").toUpperCase();
                                                if (s.startsWith("E1")) return 1; if (s.startsWith("E2")) return 2;
                                                if (s.startsWith("M3")) return 3; if (s.startsWith("M2")) return 4;
                                                if (s.startsWith("M1")) return 5; if (s.startsWith("P4")) return 6;
                                                return 99;
                                            };
                                            return rank(a.staffLevel) - rank(b.staffLevel);
                                        })
                                        .map((p, i) => (
                                            <tr key={p.id || p._id || i} style={{ background: '#f7faff' }}>
                                                <td style={{ fontWeight: 600 }}>{p.firstName} {p.lastName} <span style={{ background: '#00b4ff', color: '#fff', borderRadius: 8, fontSize: 11, padding: '2px 8px', marginLeft: 6 }}>Leadership</span></td>
                                                <td style={{ fontWeight: 700 }}>{p.staffLevel}</td>
                                                <td>{p.department}</td><td>{p.manager}</td><td>{p.email}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="panel">
                        <div className="panel__title">People in Organisation</div>
                        {peopleFilter && (
                            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ background: '#e0f7fa', color: '#007b8a', borderRadius: 8, fontSize: 13, padding: '2px 10px', fontWeight: 600 }}>Filter Active: {peopleFilter}</span>
                                <button style={{ border: 'none', background: 'none', color: '#007b8a', fontWeight: 700, cursor: 'pointer', fontSize: 16 }} onClick={() => setPeopleFilter(null)}>×</button>
                            </div>
                        )}
                        <PeopleTable orgId={id} filter={peopleFilter} />
                    </div>
                )}
            </div>
        </DetailsLayout>
    );
};

export default PeporgCard;