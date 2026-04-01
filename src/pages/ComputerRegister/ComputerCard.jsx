// =====================================================
// ComputerCard.jsx
// - Create + View modes
// - Make/Model catalogs (Add-to-list)
// - OS version suggestions (endoflife) + OS logo
// - Warranty site link based on Make
// - QR Gen Plan (gated, highlight, generate QR into image box)
// - Print-friendly QR label (click "QR code available")
// =====================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";

import { fetchComputerById, createComputer } from "./computerApi";
import { getMakeLogo } from "../../utils/makeLogos";
import { getOSLogo } from "../../utils/osLogos";
import { getModelsForMake, addModelForMake } from "../../utils/modelCatalog";
import { getMakes, addMake, normalizeMake } from "../../utils/makeCatalog";
import { getWarrantySite } from "../../utils/warrantySites";

import "./ComputerCard.css";

// =====================================================
// CONSTANTS
// =====================================================
const EMPTY_FORM = {
    openId: "",
    computerName: "",
    status: "Live",
    owner: "",
    previousOwner: "",
    type: "",
    make: "",
    model: "",
    serialNumber: "",
    os: "",
    datePurchased: "",
    warrantyDate: "",
    purchaseAmount: "",
    location: "",
    company: "",
    farNumber: "",
    qrCodeValue: "",
    notes: ""
};

// NOTE: Decide what “all fields” means for QR readiness.
// This list is the “Required for QR” gate.
const QR_REQUIRED_FIELDS = [
    "computerName",
    "status",
    "owner",
    "type",
    "make",
    "model",
    "serialNumber",
    "os",
    "company",
    "location",
    "datePurchased",
    "warrantyDate",
    "purchaseAmount",
    "farNumber"
];

// =====================================================
// PRINT LABEL CONSTANTS (mm)
// Change these to match your label stock
// =====================================================
const LABEL_MM = { width: 62, height: 29 }; // common label size
const LABEL_MARGIN_MM = 2;

// =====================================================
// HELPERS: OS normalization + detection
// =====================================================
function tidySpaces(s) {
    return String(s || "")
        .trim()
        .replace(/\s+/g, " ");
}

function normalizeWindowsReleaseLabel(labelOrName) {
    let s = tidySpaces(labelOrName);
    // remove stray (EW) or similar oddities if they appear
    s = s.replace(/\s*\(EW\)\s*/gi, " ");
    s = tidySpaces(s);
    if (/^\d/.test(s)) s = `Windows ${s}`;
    return tidySpaces(s);
}

function normalizeMacReleaseLabel(labelOrName) {
    let s = tidySpaces(labelOrName);
    s = s.replace(/^mac os x/i, "macOS");
    s = s.replace(/^os x/i, "macOS");
    s = s.replace(/^mac os/i, "macOS");
    return tidySpaces(s);
}

function detectOsProductFromText(value) {
    const key = String(value || "").toLowerCase().trim();
    if (!key) return null;

    if (key.includes("windows") || key.includes("win")) return "windows";
    if (
        key.includes("mac") ||
        key.includes("macos") ||
        key.includes("mac os") ||
        key.includes("os x") ||
        key.includes("osx")
    ) {
        return "macos";
    }
    return null;
}

// =====================================================
// HELPERS: QR readiness + payload
// =====================================================
function isQrReady(asset) {
    return QR_REQUIRED_FIELDS.every((k) => String(asset?.[k] || "").trim() !== "");
}

function buildQrPayload(asset) {
    // QR content (v1): JSON string (future-proof)
    return JSON.stringify({
        assetType: "computer",
        assetId: asset?._id || asset?.openId || "",
        openId: asset?.openId || "",
        computerName: asset?.computerName || "",
        make: asset?.make || "",
        model: asset?.model || "",
        serialNumber: asset?.serialNumber || "",
        company: asset?.company || "",
        location: asset?.location || ""
    });
}

// =====================================================
// PRINT LABEL: open a print window with label-sized layout
// =====================================================
function openQrLabelPrint({ title, qrDataUrl, lines }) {
    const w = window.open("", "_blank", "noopener,noreferrer,width=520,height=420");
    if (!w) return;

    const safeTitle = title || "Asset Label";
    const labelW = LABEL_MM.width;
    const labelH = LABEL_MM.height;
    const margin = LABEL_MARGIN_MM;

    const rowsHtml = (lines || [])
        .filter(Boolean)
        .map((t) => `<div class="row">${String(t)}</div>`)
        .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { size: ${labelW}mm ${labelH}mm; margin: ${margin}mm; }
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: #0f172a;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      background: #fff;
    }
    .btn {
      border: 1px solid #e5e7eb;
      background: #2563eb;
      color: #fff;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
    }
    .btn.secondary { background: #0f172a; }
    .wrap {
      width: ${labelW}mm;
      height: ${labelH}mm;
      box-sizing: border-box;
      padding: ${margin}mm;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px;
      align-items: center;
    }
    .text {
      display: grid;
      gap: 2px;
      font-size: 9px;
      line-height: 1.1;
    }
    .row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row .big { font-size: 10px; font-weight: 800; }
    .qr {
      width: 22mm;
      height: 22mm;
      display: grid;
      place-items: center;
    }
    .qr img { width: 100%; height: 100%; object-fit: contain; }
    @media print { .toolbar { display: none; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" onclick="window.print()">Print</button>
    <button class="btn secondary" onclick="window.close()">Close</button>
  </div>

  <div class="wrap">
    <div class="text">${rowsHtml}</div>
    <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ""}</div>
  </div>
</body>
</html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
}

// =====================================================
// COMPONENT
// =====================================================
export default function ComputerCard() {
    // -----------------------------
    // Router / Mode
    // -----------------------------
    const { id } = useParams();
    const navigate = useNavigate();
    const isCreate = !id || id === "new";

    // -----------------------------
    // Core State
    // -----------------------------
    const [computer, setComputer] = useState(null);
    const [loading, setLoading] = useState(!isCreate);
    const [err, setErr] = useState("");

    // Create mode form state
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // -----------------------------
    // OS Suggestions State (Create mode)
    // -----------------------------
    const [osProduct, setOsProduct] = useState("windows");
    const [osOptions, setOsOptions] = useState([]);
    const [osLoading, setOsLoading] = useState(false);
    const [osErr, setOsErr] = useState("");

    // -----------------------------
    // Make/Model Catalog State
    // -----------------------------
    const [modelOptions, setModelOptions] = useState([]);
    const [modelMsg, setModelMsg] = useState("");
    const [makeOptions, setMakeOptions] = useState([]);
    const [makeMsg, setMakeMsg] = useState("");

    // -----------------------------
    // QR State
    // -----------------------------
    const [qrImage, setQrImage] = useState("");
    const [qrGenerating, setQrGenerating] = useState(false);

    // -----------------------------
    // Formatting helpers
    // -----------------------------
    const fmt = useMemo(() => {
        const date = (d) => {
            if (!d) return "—";
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return "—";
            return dt.toLocaleDateString();
        };
        const money = (n) => {
            if (n === null || n === undefined || n === "") return "—";
            const num = Number(n);
            if (Number.isNaN(num)) return "—";
            return num.toLocaleString(undefined, { style: "currency", currency: "ZAR" });
        };
        const text = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
        return { date, money, text };
    }, []);

    // -----------------------------
    // Status pill class helper
    // -----------------------------
    const statusClassFor = (status) => {
        const s = String(status || "");
        return s === "Live"
            ? "pillLive"
            : s === "In Store"
                ? "pillStore"
                : s === "Repair"
                    ? "pillRepair"
                    : s === "Retired"
                        ? "pillRetired"
                        : s === "Disposed"
                            ? "pillDisposed"
                            : "pillOther";
    };

    const statusClass = statusClassFor(isCreate ? form.status : computer?.status);

    // -----------------------------
    // Form helper
    // -----------------------------
    function setField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    // =====================================================
    // EFFECT: Load record in View Mode
    // =====================================================
    useEffect(() => {
        let alive = true;

        async function load() {
            setErr("");

            if (isCreate) {
                setComputer(null);
                setForm(EMPTY_FORM);
                setQrImage("");
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const data = await fetchComputerById(id);
                if (!alive) return;

                setComputer(data);

                // Render QR image if qrCodeValue exists
                if (data?.qrCodeValue) {
                    const dataUrl = await QRCode.toDataURL(data.qrCodeValue, {
                        width: 256,
                        margin: 1,
                        errorCorrectionLevel: "M"
                    });
                    if (!alive) return;
                    setQrImage(dataUrl);
                } else {
                    setQrImage("");
                }
            } catch (e) {
                if (!alive) return;
                setErr(e?.message || "Failed to load asset");
                setComputer(null);
                setQrImage("");
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [id, isCreate]);

    // =====================================================
    // OS SUGGESTIONS: Fetch from endoflife.date (Create Mode)
    // =====================================================
    const fetchOsReleases = useCallback(async (product) => {
        const v1Url = `https://endoflife.date/api/v1/products/${product}`;
        const v0Url = `https://endoflife.date/api/${product}.json`;

        try {
            const r1 = await fetch(v1Url, { headers: { Accept: "application/json" } });
            if (!r1.ok) throw new Error(`endoflife.date v1 error ${r1.status}`);
            const data = await r1.json();

            const releases = Array.isArray(data?.result?.releases)
                ? data.result.releases
                : Array.isArray(data?.releases)
                    ? data.releases
                    : [];

            const options = releases
                .map((r) => {
                    const raw = r?.label || r?.name || "";
                    if (!raw) return "";
                    if (product === "windows") return normalizeWindowsReleaseLabel(raw);
                    if (product === "macos") return normalizeMacReleaseLabel(raw);
                    return tidySpaces(raw);
                })
                .filter(Boolean);

            return Array.from(new Set(options));
        } catch {
            const r0 = await fetch(v0Url, { headers: { Accept: "application/json" } });
            if (!r0.ok) throw new Error(`endoflife.date v0 error ${r0.status}`);
            const data0 = await r0.json();

            const options0 = Array.isArray(data0)
                ? data0
                    .map((x) => String(x?.cycle || x?.name || x?.label || "").trim())
                    .filter(Boolean)
                : [];

            const normalized = options0.map((raw) => {
                if (product === "windows") return normalizeWindowsReleaseLabel(raw);
                if (product === "macos") return normalizeMacReleaseLabel(raw);
                return tidySpaces(raw);
            });

            return Array.from(new Set(normalized));
        }
    }, []);

    useEffect(() => {
        if (!isCreate) return;

        let alive = true;

        async function loadOsOptions() {
            setOsErr("");
            setOsLoading(true);
            try {
                const list = await fetchOsReleases(osProduct);
                if (!alive) return;
                list.sort((a, b) => String(a).localeCompare(String(b)));
                setOsOptions(list);
            } catch (e) {
                if (!alive) return;
                setOsErr(e?.message || "Failed to load OS versions");
                setOsOptions([]);
            } finally {
                if (alive) setOsLoading(false);
            }
        }

        loadOsOptions();
        return () => {
            alive = false;
        };
    }, [isCreate, osProduct, fetchOsReleases]);

    // =====================================================
    // MAKE/MODEL CATALOG: Load makes + models (Create Mode)
    // =====================================================
    useEffect(() => {
        if (!isCreate) return;
        setMakeOptions(getMakes());
    }, [isCreate]);

    useEffect(() => {
        if (!isCreate) return;

        const make = (form.make || "").trim();
        if (!make) {
            setModelOptions([]);
            setModelMsg("");
            return;
        }

        const list = getModelsForMake(make);
        setModelOptions(list);

        const key = make.toLowerCase().trim();
        const supported = ["hp", "dell", "asus"];

        if (!supported.includes(key)) {
            setModelMsg("No default model list for this make yet — type a model and click Add.");
        } else {
            setModelMsg(list.length ? "" : "No models in the list yet — add one.");
        }
    }, [isCreate, form.make]);

    function onAddMakeToList() {
        const makeRaw = (form.make || "").trim();
        if (!makeRaw) {
            setMakeMsg("Type a Make to add (e.g. HP, Dell, Asus).");
            return;
        }
        const normalized = normalizeMake(makeRaw);
        const updated = addMake(normalized);
        setMakeOptions(updated);
        setField("make", normalized);
        setMakeMsg(`Added "${normalized}" to Makes.`);
    }

    function onAddModelToList() {
        const make = (form.make || "").trim();
        const model = (form.model || "").trim();

        if (!make) {
            setModelMsg("Enter a Make first (HP, Dell, Asus...).");
            return;
        }
        if (!model) {
            setModelMsg("Type a Model to add.");
            return;
        }

        const updated = addModelForMake(make, model);
        setModelOptions(updated);
        setModelMsg(`Added "${model}" to ${make} models.`);
    }

    // =====================================================
    // QR GEN PLAN: Ready gate + Generate button + QR image
    // =====================================================
    const current = isCreate ? form : computer || {};
    const qrReady = isQrReady(current);
    const desiredQrValue = qrReady ? buildQrPayload(current) : "";
    const qrValue = current?.qrCodeValue || "";
    const qrStale = qrReady && qrValue && qrValue !== desiredQrValue;

    async function onGenerateQr() {
        if (!qrReady) return;

        try {
            setQrGenerating(true);
            const payload = buildQrPayload(current);
            const dataUrl = await QRCode.toDataURL(payload, {
                width: 256,
                margin: 1,
                errorCorrectionLevel: "M"
            });

            setQrImage(dataUrl);

            // Save payload string to qrCodeValue so it persists when you Save
            if (isCreate) setField("qrCodeValue", payload);
        } catch (e) {
            console.error("QR generation failed:", e);
            alert("Failed to generate QR code.");
        } finally {
            setQrGenerating(false);
        }
    }

    // =====================================================
    // PRINT: click handler for "QR code available"
    // =====================================================
    async function onPrintQrLabel() {
        const payload = current?.qrCodeValue || (qrReady ? buildQrPayload(current) : "");
        if (!payload) return;

        try {
            const labelQrDataUrl = await QRCode.toDataURL(payload, {
                width: 512,
                margin: 1,
                errorCorrectionLevel: "M"
            });

            const title = `Label - ${current?.computerName || "Computer"}`;
            const lines = [
                `${current?.computerName || ""}`.trim(),
                `${current?.make || ""} ${current?.model || ""}`.trim(),
                `S/N: ${current?.serialNumber || ""}`.trim(),
                `${current?.company || ""}`.trim(),
                `${current?.location || ""}`.trim()
            ].filter(Boolean);

            if (lines.length > 0) {
                lines[0] = `<span class="big">${lines[0]}</span>`;
            }

            openQrLabelPrint({
                title,
                qrDataUrl: labelQrDataUrl,
                lines
            });
        } catch (e) {
            console.error("Label print failed:", e);
            alert("Failed to prepare print label.");
        }
    }

    // =====================================================
    // SAVE (Create Mode)
    // =====================================================
    async function onSaveNew() {
        setErr("");

        if (!String(form.computerName || "").trim()) {
            setErr("Computer Name is required.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                computerName: String(form.computerName).trim(),
                make: String(form.make || "").trim(),
                model: String(form.model || "").trim(),
                serialNumber: String(form.serialNumber || "").trim(),
                owner: String(form.owner || "").trim(),
                previousOwner: String(form.previousOwner || "").trim(),
                os: String(form.os || "").trim(),
                location: String(form.location || "").trim(),
                company: String(form.company || "").trim(),
                farNumber: String(form.farNumber || "").trim(),
                qrCodeValue: String(form.qrCodeValue || "").trim(),
                notes: String(form.notes || "").trim(),
                type: String(form.type || "").trim(),
                openId: form.openId === "" ? undefined : form.openId,
                purchaseAmount: form.purchaseAmount === "" ? undefined : Number(form.purchaseAmount),
                datePurchased: form.datePurchased === "" ? undefined : form.datePurchased,
                warrantyDate: form.warrantyDate === "" ? undefined : form.warrantyDate
            };

            const created = await createComputer(payload);
            navigate(`/computers/${created.id}`);
        } catch (e) {
            setErr(e?.message || "Failed to save asset");
        } finally {
            setSaving(false);
        }
    }

    // =====================================================
    // RIGHT PANEL: Warranty + Apps + QR
    // =====================================================
    const appsAssigned = Array.isArray(current?.applications) ? current.applications : [];
    const warrantySite = getWarrantySite(current?.make);

    // =====================================================
    // RENDER: Loading / Error
    // =====================================================
    if (loading) {
        return (
            <div className="assetPage">
                <div className="assetShell">
                    <div className="panel">
                        <div className="loading">Loading asset…</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isCreate && err && !computer) {
        return (
            <div className="assetPage">
                <div className="assetShell">
                    <div className="panel">
                        <div className="loading" style={{ color: "#b42318" }}>
                            {err}
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <button className="btn btnGhost" onClick={() => navigate("/computers")}>
                                ← Back to Register
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =====================================================
    // RENDER: CREATE MODE
    // - Save/Cancel moved into QR block
    // - Removed spacer divs in grid
    // =====================================================
    if (isCreate) {
        return (
            <div className="assetPage">
                <div className="assetShell">
                    {/* ===== HEADER (Create) ===== */}
                    <header className="assetHeader">
                        <div className="assetHeader__nav">
                            <button className="btn btnGhost" onClick={() => navigate("/computers")}>
                                ← Back
                            </button>
                        </div>

                        <div className="assetHeader__main">
                            <div className="headerLogos">
                                <div className="logoBox logoBox--big" title={form.make || "Unknown Make"}>
                                    <img className="logoImg" src={getMakeLogo(form.make)} alt="Make logo" />
                                </div>
                                <div className="logoBox logoBox--big" title={form.os || "Unknown OS"}>
                                    <img className="logoImg" src={getOSLogo(form.os)} alt="OS logo" />
                                </div>
                            </div>

                            <div className="assetHeader__titleBlock">
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        minWidth: 0
                                    }}
                                >
                                    <h1
                                        className="assetHeader__title"
                                        title={form.computerName || "New Asset"}
                                        style={{ margin: 0 }}
                                    >
                                        {form.computerName ? form.computerName : "Untitled Computer"}
                                    </h1>
                                    <span className={`pill ${statusClass}`}>{form.status || "—"}</span>
                                </div>

                                <div className="assetHeader__meta" style={{ marginTop: 4 }}>
                                    <span className="metaText">New Computer Asset</span>
                                    <span className="metaDot">•</span>
                                    <span className="metaText">Creating new record</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions moved to QR block */}
                        <div className="assetHeader__actions" />
                    </header>

                    {/* ===== BODY (Create) ===== */}
                    <main className="assetGrid">
                        {/* ===== LEFT PANEL: DETAILS FORM ===== */}
                        <section className="panel">
                            <div className="panel__title">Details</div>
                            {err ? <div style={{ color: "#b42318", marginBottom: 10 }}>{err}</div> : null}

                            <div className="fieldGrid">
                                <div className="field">
                                    <div className="label">Computer Name *</div>
                                    <input
                                        className="value"
                                        value={form.computerName}
                                        onChange={(e) => setField("computerName", e.target.value)}
                                    />
                                </div>

                                <div className="field">
                                    <div className="label">Status</div>
                                    <select className="value" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                                        <option value="Live">Live</option>
                                        <option value="In Store">In Store</option>
                                        <option value="Repair">Repair</option>
                                        <option value="Retired">Retired</option>
                                        <option value="Disposed">Disposed</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="field">
                                    <div className="label">Owner</div>
                                    <input className="value" value={form.owner} onChange={(e) => setField("owner", e.target.value)} />
                                </div>

                                <div className="field">
                                    <div className="label">Previous Owner</div>
                                    <input
                                        className="value"
                                        value={form.previousOwner}
                                        onChange={(e) => setField("previousOwner", e.target.value)}
                                    />
                                </div>

                                <div className="field">
                                    <div className="label">Type</div>
                                    <select className="value" value={form.type} onChange={(e) => setField("type", e.target.value)}>
                                        <option value="">— Select —</option>
                                        <option value="Laptop">Laptop</option>
                                        <option value="Desktop">Desktop</option>
                                    </select>
                                </div>

                                <div className="field">
                                    <div className="label">Serial Number</div>
                                    <input
                                        className="value"
                                        value={form.serialNumber}
                                        onChange={(e) => setField("serialNumber", e.target.value)}
                                    />
                                </div>

                                <div className="field">
                                    <div className="label">Make</div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <input
                                            className="value"
                                            value={form.make}
                                            onChange={(e) => {
                                                setField("make", e.target.value);
                                                setMakeMsg("");
                                                setModelMsg("");
                                            }}
                                            placeholder="Start typing make..."
                                            list="makeOptionsList"
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btnPrimary" onClick={onAddMakeToList} style={{ whiteSpace: "nowrap" }}>
                                            Add
                                        </button>
                                    </div>

                                    <datalist id="makeOptionsList">
                                        {makeOptions.map((m) => (
                                            <option key={m} value={m} />
                                        ))}
                                    </datalist>

                                    {makeMsg ? <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>{makeMsg}</div> : null}
                                </div>

                                <div className="field">
                                    <div className="label">Model</div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <input
                                            className="value"
                                            value={form.model}
                                            onChange={(e) => {
                                                setField("model", e.target.value);
                                                setModelMsg("");
                                            }}
                                            placeholder="Start typing model..."
                                            list="modelOptions"
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btnPrimary" onClick={onAddModelToList} style={{ whiteSpace: "nowrap" }}>
                                            Add
                                        </button>
                                    </div>

                                    <datalist id="modelOptions">
                                        {modelOptions.map((m) => (
                                            <option key={m} value={m} />
                                        ))}
                                    </datalist>

                                    {modelMsg ? <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>{modelMsg}</div> : null}
                                </div>

                                <div className="field">
                                    <div className="label">FAR Number</div>
                                    <input className="value" value={form.farNumber} onChange={(e) => setField("farNumber", e.target.value)} />
                                </div>

                                <div className="field">
                                    <div className="label">
                                        Operating System
                                        <span style={{ marginLeft: 8, color: "#64748b", fontSize: 12 }}>
                                            {osLoading ? "Loading versions..." : osErr ? "Versions unavailable" : `Source: ${osProduct}`}
                                        </span>
                                    </div>
                                    <input
                                        className="value"
                                        value={form.os}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setField("os", v);
                                            const detected = detectOsProductFromText(v);
                                            if (detected && detected !== osProduct) setOsProduct(detected);
                                        }}
                                        placeholder="Type Windows or Mac..."
                                        list="osVersions"
                                    />
                                    <datalist id="osVersions">
                                        {osOptions.map((o) => (
                                            <option key={o} value={o} />
                                        ))}
                                    </datalist>
                                    {osErr ? <div style={{ marginTop: 6, color: "#b42318", fontSize: 12 }}>{osErr}</div> : null}
                                </div>

                                <div className="field">
                                    <div className="label">Company</div>
                                    <input className="value" value={form.company} onChange={(e) => setField("company", e.target.value)} />
                                </div>

                                <div className="field">
                                    <div className="label">Location</div>
                                    <input className="value" value={form.location} onChange={(e) => setField("location", e.target.value)} />
                                </div>

                                <div className="field">
                                    <div className="label">Date Purchased</div>
                                    <input className="value" type="date" value={form.datePurchased} onChange={(e) => setField("datePurchased", e.target.value)} />
                                </div>

                                <div className="field">
                                    <div className="label">Warranty Date</div>
                                    <input className="value" type="date" value={form.warrantyDate} onChange={(e) => setField("warrantyDate", e.target.value)} />
                                </div>

                                <div className="field">
                                    <div className="label">Purchase Amount (ZAR)</div>
                                    <input
                                        className="value"
                                        type="number"
                                        step="0.01"
                                        value={form.purchaseAmount}
                                        onChange={(e) => setField("purchaseAmount", e.target.value)}
                                    />
                                </div>

                                <div className="field fieldFull">
                                    <div className="label">Notes</div>
                                    <textarea className="value" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} />
                                </div>
                            </div>
                        </section>

                        {/* ===== RIGHT PANEL: BLOCKS ===== */}
                        <aside className="panel panelSticky">
                            <div className="panel__title">Quick Summary</div>

                            <div className="sideBlocks">
                                <div className="sideBlock">
                                    <div className="sideBlock__title">Quick Summary</div>
                                    <div className="summary">
                                        <div className="summaryRow">
                                            <div className="summaryLabel">Status</div>
                                            <div className="summaryValue">
                                                <span className={`pill ${statusClass}`}>{form.status || "—"}</span>
                                            </div>
                                        </div>
                                        <div className="summaryRow">
                                            <div className="summaryLabel">Make</div>
                                            <div className="summaryValue">{form.make || "—"}</div>
                                        </div>
                                        <div className="summaryRow">
                                            <div className="summaryLabel">Model</div>
                                            <div className="summaryValue">{form.model || "—"}</div>
                                        </div>
                                        <div className="summaryRow">
                                            <div className="summaryLabel">Owner</div>
                                            <div className="summaryValue">{form.owner || "—"}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sideBlock">
                                    <div className="sideBlock__title">Warranty Site</div>
                                    {warrantySite ? (
                                        <a className="warrantyLink" href={warrantySite.url} target="_blank" rel="noreferrer">
                                            {warrantySite.label}
                                        </a>
                                    ) : (
                                        <div className="sideBlock__text">
                                            No warranty site configured for <b>{current?.make || "this make"}</b>.
                                        </div>
                                    )}
                                </div>

                                <div className="sideBlock">
                                    <div className="sideBlock__title">Applications Assigned</div>
                                    {appsAssigned.length === 0 ? (
                                        <div className="sideBlock__text">No applications assigned yet.</div>
                                    ) : (
                                        <div className="appsList">
                                            {appsAssigned.map((app) => (
                                                <div className="appPill" key={app}>
                                                    <span>{app}</span>
                                                    <span className="appPill__meta">Assigned</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* --- Block: QR Code (QR Gen Plan) --- */}
                                <div className={`sideBlock ${qrReady ? "qrReady" : ""}`}>
                                    <div className="sideBlock__title">QR Code</div>

                                    <div className="qrBox">
                                        {qrImage ? <img className="qrImg" src={qrImage} alt="Asset QR Code" /> : <div className="qrPlaceholder">QR</div>}
                                        <div className="qrValue">
                                            {qrImage ? (qrStale ? "QR needs regenerate" : "QR code generated") : qrValue ? qrValue : "No QR value yet"}
                                        </div>
                                    </div>

                                    {qrReady ? (
                                        <button
                                            className="btn btnPrimary"
                                            style={{ marginTop: 10, width: "100%" }}
                                            onClick={onGenerateQr}
                                            disabled={qrGenerating}
                                            title={qrStale ? "Fields changed — regenerate QR" : "Generate QR"}
                                        >
                                            {qrGenerating ? "Generating..." : qrImage ? "Regenerate QR Code" : "Generate QR Code"}
                                        </button>
                                    ) : (
                                        <div className="sideBlock__text" style={{ marginTop: 8 }}>
                                            Complete all required fields to enable QR generation.
                                        </div>
                                    )}

                                    {/* ✅ Save/Cancel moved here (under QR) */}
                                    <div className="qrActions">
                                        <button className="btn btnPrimary" type="button" onClick={onSaveNew} disabled={saving}>
                                            {saving ? "Saving..." : "Save"}
                                        </button>

                                        <button className="btn btnPrimary" type="button" onClick={() => navigate("/computers")} disabled={saving}>
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

    // =====================================================
    // RENDER: VIEW MODE
    // =====================================================
    const statusClassView = statusClassFor(computer?.status);

    return (
        <div className="assetPage">
            <div className="assetShell">
                {/* ===== HEADER (View) ===== */}
                <header className="assetHeader">
                    <div className="assetHeader__nav">
                        <button className="btn btnGhost" onClick={() => navigate("/computers")}>
                            ← Back
                        </button>
                    </div>

                    <div className="assetHeader__main">
                        <div className="headerLogos">
                            <div className="logoBox logoBox--big" title={computer?.make || "Unknown Make"}>
                                <img className="logoImg" src={getMakeLogo(computer?.make)} alt="Make logo" />
                            </div>
                            <div className="logoBox logoBox--big" title={computer?.os || "Unknown OS"}>
                                <img className="logoImg" src={getOSLogo(computer?.os)} alt="OS logo" />
                            </div>
                        </div>

                        <div className="assetHeader__titleBlock">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                <h1 className="assetHeader__title" title={computer?.computerName} style={{ margin: 0 }}>
                                    {fmt.text(computer?.computerName)}
                                </h1>
                                <span className={`pill ${statusClassView}`}>{fmt.text(computer?.status)}</span>
                            </div>

                            <div className="assetHeader__meta" style={{ marginTop: 4 }}>
                                <span className="metaText">Computer Asset</span>
                                <span className="metaDot">•</span>
                                <span className="metaText">Asset ID: {fmt.text(computer?.openId || computer?._id)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="assetHeader__actions">
                        <button className="btn btnPrimary" type="button" disabled>
                            Edit
                        </button>
                        <button className="btn btnDangerOutline" type="button" disabled>
                            Retire
                        </button>
                    </div>
                </header>

                {/* ===== BODY (View) ===== */}
                <main className="assetGrid">
                    <section className="panel">
                        <div className="panel__title">Details</div>

                        <div className="fieldGrid">
                            <div className="field">
                                <div className="label">Computer Name</div>
                                <div className="value">{fmt.text(computer?.computerName)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Status</div>
                                <div className="value">
                                    <span className={`pill ${statusClassView}`}>{fmt.text(computer?.status)}</span>
                                </div>
                            </div>

                            <div className="field">
                                <div className="label">Owner</div>
                                <div className="value">{fmt.text(computer?.owner)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Previous Owner</div>
                                <div className="value">{fmt.text(computer?.previousOwner)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Type</div>
                                <div className="value">{fmt.text(computer?.type)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Make</div>
                                <div className="value">{fmt.text(computer?.make)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Model</div>
                                <div className="value">{fmt.text(computer?.model)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Serial Number</div>
                                <div className="value mono">{fmt.text(computer?.serialNumber)}</div>
                            </div>

                            <div className="field">
                                <div className="label">FAR Number</div>
                                <div className="value">{fmt.text(computer?.farNumber)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Operating System</div>
                                <div className="value">{fmt.text(computer?.os)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Company</div>
                                <div className="value">{fmt.text(computer?.company)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Location</div>
                                <div className="value">{fmt.text(computer?.location)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Date Purchased</div>
                                <div className="value">{fmt.date(computer?.datePurchased)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Warranty Date</div>
                                <div className="value">{fmt.date(computer?.warrantyDate)}</div>
                            </div>

                            <div className="field">
                                <div className="label">Purchase Amount</div>
                                <div className="value">{fmt.money(computer?.purchaseAmount)}</div>
                            </div>

                            <div className="field fieldFull">
                                <div className="label">Notes</div>
                                <div className="value">{fmt.text(computer?.notes)}</div>
                            </div>
                        </div>
                    </section>

                    <aside className="panel panelSticky">
                        <div className="panel__title">Quick Summary</div>

                        <div className="sideBlocks">
                            <div className="sideBlock">
                                <div className="sideBlock__title">Quick Summary</div>
                                <div className="summary">
                                    <div className="summaryRow">
                                        <div className="summaryLabel">Status</div>
                                        <div className="summaryValue">
                                            <span className={`pill ${statusClassView}`}>{fmt.text(computer?.status)}</span>
                                        </div>
                                    </div>

                                    <div className="summaryRow">
                                        <div className="summaryLabel">Serial</div>
                                        <div className="summaryValue mono">{fmt.text(computer?.serialNumber)}</div>
                                    </div>

                                    <div className="summaryRow">
                                        <div className="summaryLabel">Owner</div>
                                        <div className="summaryValue">{fmt.text(computer?.owner)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">Warranty Site</div>
                                {warrantySite ? (
                                    <a className="warrantyLink" href={warrantySite.url} target="_blank" rel="noreferrer">
                                        {warrantySite.label}
                                    </a>
                                ) : (
                                    <div className="sideBlock__text">
                                        No warranty site configured for <b>{computer?.make || "this make"}</b>.
                                    </div>
                                )}
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">Applications Assigned</div>
                                {appsAssigned.length === 0 ? (
                                    <div className="sideBlock__text">No applications assigned yet.</div>
                                ) : (
                                    <div className="appsList">
                                        {appsAssigned.map((app) => (
                                            <div className="appPill" key={app}>
                                                <span>{app}</span>
                                                <span className="appPill__meta">Assigned</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className={`sideBlock ${computer?.qrCodeValue ? "qrReady" : ""}`}>
                                <div className="sideBlock__title">QR Code</div>

                                <div className="qrBox">
                                    {qrImage ? <img className="qrImg" src={qrImage} alt="Asset QR Code" /> : <div className="qrPlaceholder">QR</div>}

                                    <div className="qrValue">
                                        {computer?.qrCodeValue ? (
                                            <button type="button" onClick={onPrintQrLabel} className="qrPrintLink" title="Click to open label print view">
                                                QR code available
                                            </button>
                                        ) : (
                                            "No QR value"
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
}