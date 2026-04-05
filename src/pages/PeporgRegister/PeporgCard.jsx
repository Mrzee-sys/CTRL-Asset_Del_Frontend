import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../../styles/DetailPageLayout.css";
import "../../styles/Register.css";

import { createOrg, updateOrg, fetchOrgById } from "./peporgApi";

const EMPTY_ORG = {
    orgName: "",
    tradingAs: "",
    address: "",
    contactNumber: "",
    vatTaxNumber: "",
    companyRegNumber: "",
    people: []
};

// -----------------------------
// CSV helpers (AD / MIT-07)
// -----------------------------
function normalizeHeader(h) {
    return String(h || "").trim().toLowerCase().replace(/\s+/g, "");
}

function isValidEmail(email) {
    const e = String(email || "").trim();
    return e.includes("@") && e.includes(".");
}

// Detect delimiter from first line (supports ; or ,)
function detectDelimiter(csvText) {
    const firstLine = String(csvText || "").split(/\r?\n/)[0] || "";
    const commas = (firstLine.match(/,/g) || []).length;
    const semis = (firstLine.match(/;/g) || []).length;

    // If semicolons dominate, use semicolon
    if (semis > commas) return ";";
    return ",";
}

// CSV parser with quoted field support + configurable delimiter
function parseCsv(text, delimiter = ",") {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    const s = String(text || "");

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        const next = s[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === delimiter) {
                row.push(field);
                field = "";
            } else if (ch === "\n") {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            } else if (ch === "\r") {
                // ignore
            } else {
                field += ch;
            }
        }
    }

    row.push(field);
    rows.push(row);

    return rows.filter((r) => r.some((c) => String(c || "").trim() !== ""));
}

function idx(headers, label) {
    return headers.indexOf(normalizeHeader(label));
}

function buildPeopleFromAdCsv(csvText) {
    const delimiter = detectDelimiter(csvText);
    const grid = parseCsv(csvText, delimiter);
    if (!grid.length) return { rows: [], errors: ["CSV is empty."], delimiter };

    const headers = grid[0].map(normalizeHeader);

    const iEmail = idx(headers, "Email");
    if (iEmail === -1) return { rows: [], errors: ['Missing required column: "Email"'], delimiter };

    const iAccount = idx(headers, "Account");
    const iFirst = idx(headers, "First Name");
    const iLast = idx(headers, "Last Name");
    const iDisplay = idx(headers, "Display Name");
    const iTitle = idx(headers, "Title");
    const iCompany = idx(headers, "Company");
    const iDept = idx(headers, "Department");
    const iPhone = idx(headers, "Phone");
    const iEmpId = idx(headers, "Employee ID");
    const iEmpType = idx(headers, "Employee Type");
    const iManager = idx(headers, "Manager");
    const iLogon = idx(headers, "Logon");
    const iLogon2k = idx(headers, "Logon (2K)");
    const iOpco = idx(headers, "OpCo");
    const iCsb = idx(headers, "CSB");
    const iLocation = idx(headers, "Location");

    const out = [];
    const errors = [];

    for (let r = 1; r < grid.length; r++) {
        const row = grid[r];

        const person = {
            account: iAccount !== -1 ? String(row[iAccount] || "").trim() : "",
            firstName: iFirst !== -1 ? String(row[iFirst] || "").trim() : "",
            lastName: iLast !== -1 ? String(row[iLast] || "").trim() : "",
            displayName: iDisplay !== -1 ? String(row[iDisplay] || "").trim() : "",
            email: String(row[iEmail] || "").trim().toLowerCase(),
            title: iTitle !== -1 ? String(row[iTitle] || "").trim() : "",
            company: iCompany !== -1 ? String(row[iCompany] || "").trim() : "",
            department: iDept !== -1 ? String(row[iDept] || "").trim() : "",
            phone: iPhone !== -1 ? String(row[iPhone] || "").trim() : "",
            employeeId: iEmpId !== -1 ? String(row[iEmpId] || "").trim() : "",
            employeeType: iEmpType !== -1 ? String(row[iEmpType] || "").trim() : "",
            manager: iManager !== -1 ? String(row[iManager] || "").trim() : "",
            logon: iLogon !== -1 ? String(row[iLogon] || "").trim() : "",
            logon2k: iLogon2k !== -1 ? String(row[iLogon2k] || "").trim() : "",
            opco: iOpco !== -1 ? String(row[iOpco] || "").trim() : "",
            csb: iCsb !== -1 ? String(row[iCsb] || "").trim() : "",
            location: iLocation !== -1 ? String(row[iLocation] || "").trim() : ""
        };

        // skip blank lines
        if (!person.email && !person.displayName && !person.account) continue;

        const ok = isValidEmail(person.email);
        out.push({ ...person, __valid: ok });
        if (!ok) errors.push(`Row ${r + 1}: invalid email "${person.email}"`);
    }

    return { rows: out, errors, delimiter };
}

function mergeByEmail(existing, incoming) {
    const map = new Map();

    (existing || []).forEach((p) => {
        const key = String(p?.email || "").trim().toLowerCase();
        if (key) map.set(key, p);
    });

    (incoming || []).forEach((p) => {
        const key = String(p?.email || "").trim().toLowerCase();
        if (key) map.set(key, p); // incoming overwrites
    });

    return Array.from(map.values());
}

function downloadAdTemplateCsv() {
    const sample =
        "Name;Account;First Name;Last Name;Display Name;Email;Title;Company;Department;Phone;Employee ID;Employee Type;Manager;Logon;Logon (2K);OpCo;CSB;Location\n" +
        'Doe, Jane;jane.doe;Jane;Doe;"Doe, Jane (JNB-XXX)";jane.doe@company.com;Manager;Omnicom;IT;+27110000000;1000000001;Regular;"Boss, One";IPG\\jane.doe;IPG\\jane.doe;OPCO;CSB;JNB\n';

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "people_import_ad_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

export default function PeporgCard() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isCreate = !id || id === "new";

    const [draftStarted] = useState(() => new Date().toISOString());
    const [org, setOrg] = useState(EMPTY_ORG);
    const [orgId, setOrgId] = useState(isCreate ? "" : id);
    const [savingOrg, setSavingOrg] = useState(false);
    const [err, setErr] = useState("");

    // CSV import state
    const fileInputRef = useRef(null);
    const [csvFileName, setCsvFileName] = useState("");
    const [importRows, setImportRows] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [importStatus, setImportStatus] = useState("");
    const [savingPeople, setSavingPeople] = useState(false);

    // ✅ New: controls "import disappears after successful save"
    const [importComplete, setImportComplete] = useState(false);

    const fmt = useMemo(() => {
        const dateTime = (d) => {
            if (!d) return "—";
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return "—";
            return dt.toLocaleString();
        };
        return { dateTime };
    }, []);

    // Load existing org when editing
    useEffect(() => {
        if (isCreate) return;

        let alive = true;

        (async () => {
            try {
                const data = await fetchOrgById(id);
                if (!alive) return;

                const people = Array.isArray(data?.people) ? data.people : [];
                setOrg({ ...EMPTY_ORG, ...data, people });
                setOrgId(data?._id || id);

                // If org already has people, show saved list by default
                if (people.length > 0) setImportComplete(true);
            } catch (e) {
                if (!alive) return;
                setErr(e?.message || "Failed to load organisation");
            }
        })();

        return () => {
            alive = false;
        };
    }, [id, isCreate]);

    const orgComplete = useMemo(() => {
        const required = ["orgName", "tradingAs", "address", "contactNumber", "vatTaxNumber", "companyRegNumber"];
        return required.every((k) => String(org[k] || "").trim() !== "");
    }, [org]);

    const peopleUnlocked = Boolean(orgId);

    const validCount = importRows.filter((r) => r.__valid).length;
    const invalidCount = importRows.filter((r) => !r.__valid).length;

    function setField(name, value) {
        setOrg((prev) => ({ ...prev, [name]: value }));
    }

    async function onSaveOrg() {
        setErr("");

        if (!orgComplete) {
            setErr("Complete all Organisation fields before saving.");
            return;
        }

        setSavingOrg(true);
        try {
            const payload = {
                orgName: org.orgName.trim(),
                tradingAs: org.tradingAs.trim(),
                address: org.address.trim(),
                contactNumber: org.contactNumber.trim(),
                vatTaxNumber: org.vatTaxNumber.trim(),
                companyRegNumber: org.companyRegNumber.trim(),
                people: Array.isArray(org.people) ? org.people : []
            };

            if (peopleUnlocked) {
                const updated = await updateOrg(orgId, payload);
                setOrg({ ...EMPTY_ORG, ...updated, people: Array.isArray(updated?.people) ? updated.people : [] });
            } else {
                const created = await createOrg(payload);
                setOrg({ ...EMPTY_ORG, ...created, people: Array.isArray(created?.people) ? created.people : [] });
                setOrgId(created._id || created.id || "");
            }
        } catch (e) {
            setErr(e?.message || "Failed to save organisation");
        } finally {
            setSavingOrg(false);
        }
    }

    async function onCsvSelected(file) {
        setErr("");
        setImportStatus("");
        setImportErrors([]);
        setImportRows([]);
        setCsvFileName(file?.name || "");

        if (!file) return;

        try {
            const text = await file.text();
            const { rows, errors, delimiter } = buildPeopleFromAdCsv(text);

            setImportRows(rows);
            setImportErrors(errors);

            if (errors.length === 0 && rows.length > 0) {
                setImportStatus(`✅ CSV loaded (${rows.length} rows) using delimiter "${delimiter}". Review and click "Add People".`);
            } else if (errors.length > 0) {
                setImportStatus(`⚠️ CSV loaded, but has issues. Fix errors below.`);
            } else {
                setImportStatus(`⚠️ CSV loaded but no usable rows were found.`);
            }
        } catch {
            setErr("Failed to read the CSV file.");
        }
    }

    function clearImport() {
        setCsvFileName("");
        setImportRows([]);
        setImportErrors([]);
        setImportStatus("");
        setImportComplete(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    function removeImportRow(index) {
        setImportRows((prev) => prev.filter((_, i) => i !== index));
    }

    async function savePeopleToOrg() {
        setErr("");
        setImportStatus("");

        if (!peopleUnlocked) {
            setErr("Save the organisation first to get an Org ID.");
            return;
        }

        if (importRows.length === 0) {
            setErr("No imported rows to save.");
            return;
        }

        if (invalidCount > 0) {
            setErr("Fix invalid emails (or remove those rows) before saving.");
            return;
        }

        setSavingPeople(true);
        try {
            const incoming = importRows.map(({ __valid, ...p }) => p);
            const merged = mergeByEmail(org.people || [], incoming);

            const payload = {
                ...org,
                orgName: String(org.orgName || "").trim(),
                tradingAs: String(org.tradingAs || "").trim(),
                address: String(org.address || "").trim(),
                contactNumber: String(org.contactNumber || "").trim(),
                vatTaxNumber: String(org.vatTaxNumber || "").trim(),
                companyRegNumber: String(org.companyRegNumber || "").trim(),
                people: merged
            };

            const updated = await updateOrg(orgId, payload);
            const savedPeople = Array.isArray(updated?.people) ? updated.people : [];

            setOrg({ ...EMPTY_ORG, ...updated, people: savedPeople });

            // ✅ success UX: hide import + show saved list
            setImportComplete(true);
            setImportStatus(`✅ Imported successfully. Saved people: ${savedPeople.length}`);

            // Clear import inputs
            setCsvFileName("");
            setImportRows([]);
            setImportErrors([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (e) {
            setErr(e?.message || "Failed to save people");
        } finally {
            setSavingPeople(false);
        }
    }

    return (
        <div className="assetPage">
            <div className="assetShell">
                {/* HEADER */}
                <header className="assetHeader">
                    <div className="assetHeader__nav">
                        <button className="btn btnGhost" onClick={() => navigate("/peporg")} type="button">
                            ← Back
                        </button>
                    </div>

                    <div className="assetHeader__main">
                        <div className="assetHeader__titleBlock">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                                <h1 className="assetHeader__title" style={{ margin: 0 }}>
                                    {org.orgName ? org.orgName : "Untitled Organisation"}
                                </h1>
                                <span className={`pill ${peopleUnlocked ? "pillLive" : "pillStore"}`}>
                                    {peopleUnlocked ? "Saved" : "Draft"}
                                </span>
                            </div>

                            <div className="assetHeader__meta" style={{ marginTop: 4, justifyContent: "center" }}>
                                <span className="metaText">People & Organisations</span>
                                <span className="metaDot">•</span>
                                <span className="metaText">{isCreate ? "Creating organisation" : "Editing organisation"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="assetHeader__right">
                        <div className="auditMeta">
                            <div className="auditRow">
                                <span className="auditLabel">Draft started</span>
                                <span className="auditValue">{fmt.dateTime(draftStarted)}</span>
                            </div>
                            <div className="auditRow">
                                <span className="auditLabel">Org ID</span>
                                <span className="auditValue">{peopleUnlocked ? orgId : "—"}</span>
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
                        <div className="panel__title">Organisation Details</div>

                        {err ? (
                            <div style={{ color: "#b42318", marginBottom: 10, fontWeight: 800 }}>{err}</div>
                        ) : null}

                        {/* Block 1: Organisation fields */}
                        <div className="fieldGrid">
                            <div className="field">
                                <div className="label">Organization Name</div>
                                <input className="value" value={org.orgName} onChange={(e) => setField("orgName", e.target.value)} />
                            </div>

                            <div className="field">
                                <div className="label">Trading As</div>
                                <input className="value" value={org.tradingAs} onChange={(e) => setField("tradingAs", e.target.value)} />
                            </div>

                            <div className="field fieldFull">
                                <div className="label">Address</div>
                                <input className="value" value={org.address} onChange={(e) => setField("address", e.target.value)} />
                            </div>

                            <div className="field">
                                <div className="label">Contact Number</div>
                                <input className="value" value={org.contactNumber} onChange={(e) => setField("contactNumber", e.target.value)} />
                            </div>

                            <div className="field">
                                <div className="label">VAT / Tax Number</div>
                                <input className="value" value={org.vatTaxNumber} onChange={(e) => setField("vatTaxNumber", e.target.value)} />
                            </div>

                            <div className="field fieldFull">
                                <div className="label">Company Registration Number</div>
                                <input className="value" value={org.companyRegNumber} onChange={(e) => setField("companyRegNumber", e.target.value)} />
                            </div>
                        </div>

                        {/* Block 2: People */}
                        <div style={{ marginTop: 14 }}>
                            <div className="panel__title">People</div>

                            {!peopleUnlocked ? (
                                <div className="sideBlock" style={{ marginTop: 10 }}>
                                    <div className="sideBlock__title">Locked</div>
                                    <div className="sideBlock__text">
                                        Save the organisation first. After the server returns an Org ID, this section unlocks.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Status banner */}
                                    {importStatus ? (
                                        <div
                                            style={{
                                                background: importStatus.startsWith("✅") ? "#ecfdf3" : "#fffaeb",
                                                border: importStatus.startsWith("✅") ? "1px solid #abefc6" : "1px solid #fedf89",
                                                color: importStatus.startsWith("✅") ? "#067647" : "#b54708",
                                                padding: 12,
                                                borderRadius: 8,
                                                fontWeight: 800,
                                                marginBottom: 12
                                            }}
                                        >
                                            {importStatus}
                                        </div>
                                    ) : null}

                                    {/* If import completed, hide import UI and show saved table */}
                                    {importComplete ? (
                                        <>
                                            <div className="registerTableWrap">
                                                <table className="registerTable" style={{ minWidth: 900 }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Display Name</th>
                                                            <th>Email</th>
                                                            <th>Title</th>
                                                            <th>Department</th>
                                                            <th>Manager</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(org.people || []).length === 0 ? (
                                                            <tr>
                                                                <td className="registerEmpty" colSpan={5}>
                                                                    No people saved yet.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            org.people.map((p, i) => (
                                                                <tr key={`${p.email || "noemail"}-${i}`}>
                                                                    <td>{p.displayName || "—"}</td>
                                                                    <td>{p.email || "—"}</td>
                                                                    <td>{p.title || "—"}</td>
                                                                    <td>{p.department || "—"}</td>
                                                                    <td>{p.manager || "—"}</td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                                <button className="btn btnGhost" type="button" onClick={() => setImportComplete(false)}>
                                                    Import more people
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Import UI (only visible until save succeeds) */}
                                            <div className="sideBlock" style={{ marginTop: 10 }}>
                                                <div className="sideBlock__title">Import from CSV</div>
                                                <div className="sideBlock__text">
                                                    Supports AD exports with comma or semicolon delimiters. Required column: <b>Email</b>.
                                                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                                        <label className="btn btnPrimary" style={{ cursor: "pointer" }}>
                                                            Choose CSV…
                                                            <input
                                                                ref={fileInputRef}
                                                                type="file"
                                                                accept=".csv,text/csv"
                                                                style={{ display: "none" }}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) onCsvSelected(file);
                                                                    // allow re-selecting the same file
                                                                    e.target.value = "";
                                                                }}
                                                            />
                                                        </label>

                                                        <button className="btn btnGhost" type="button" onClick={clearImport} disabled={!csvFileName && importRows.length === 0}>
                                                            Clear
                                                        </button>

                                                        <button className="btn btnGhost" type="button" onClick={downloadAdTemplateCsv}>
                                                            Download template
                                                        </button>
                                                    </div>

                                                    {csvFileName ? (
                                                        <div style={{ marginTop: 8, fontSize: 12 }}>
                                                            File: <b>{csvFileName}</b>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {importErrors.length > 0 ? (
                                                <div style={{ marginTop: 10, color: "#b42318", fontWeight: 800 }}>
                                                    {importErrors.slice(0, 10).map((m) => (
                                                        <div key={m}>{m}</div>
                                                    ))}
                                                    {importErrors.length > 10 ? <div>…and {importErrors.length - 10} more</div> : null}
                                                </div>
                                            ) : null}

                                            {importRows.length > 0 ? (
                                                <>
                                                    <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                                                        Parsed: {importRows.length} • Valid emails: {validCount} • Invalid emails: {invalidCount}
                                                    </div>

                                                    <div className="registerTableWrap" style={{ marginTop: 10 }}>
                                                        <table className="registerTable" style={{ minWidth: 1100 }}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Account</th>
                                                                    <th>Display Name</th>
                                                                    <th>Email</th>
                                                                    <th>Title</th>
                                                                    <th>Department</th>
                                                                    <th>Manager</th>
                                                                    <th>Valid</th>
                                                                    <th></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {importRows.map((p, idxRow) => (
                                                                    <tr key={`${p.email}-${idxRow}`}>
                                                                        <td>{p.account || "—"}</td>
                                                                        <td>{p.displayName || "—"}</td>
                                                                        <td>{p.email || "—"}</td>
                                                                        <td>{p.title || "—"}</td>
                                                                        <td>{p.department || "—"}</td>
                                                                        <td>{p.manager || "—"}</td>
                                                                        <td>{p.__valid ? "Yes" : "No"}</td>
                                                                        <td style={{ width: 110 }}>
                                                                            <button className="btn btnGhost" type="button" onClick={() => removeImportRow(idxRow)}>
                                                                                Remove
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                                                        <button
                                                            className="btn btnPrimary"
                                                            type="button"
                                                            onClick={savePeopleToOrg}
                                                            disabled={savingPeople || invalidCount > 0}
                                                        >
                                                            {savingPeople ? "Saving..." : "Add People to Organisation"}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : null}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    <aside className="panel panelSticky">
                        <div className="panel__title">Quick Summary</div>

                        <div className="sideBlocks">
                            <div className="sideBlock">
                                <div className="sideBlock__title">Status</div>
                                <div className="sideBlock__text">
                                    {peopleUnlocked
                                        ? "Organisation saved — People section available."
                                        : "Draft — complete and save org to unlock People section."}
                                </div>
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">People</div>
                                <div className="sideBlock__text">
                                    Saved people: <b>{Array.isArray(org.people) ? org.people.length : 0}</b>
                                </div>
                            </div>

                            <div className="actionBlock">
                                <div className="actionBlock__buttons">
                                    <button className="btn btnPrimary" type="button" onClick={onSaveOrg} disabled={savingOrg}>
                                        {savingOrg ? "Saving..." : "Save Organisation"}
                                    </button>

                                    <button className="btn btnGhost" type="button" onClick={() => navigate("/peporg")} disabled={savingOrg}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
}