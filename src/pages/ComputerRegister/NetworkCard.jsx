import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiGlobe,
  FiMonitor,
  FiPlus,
  FiPrinter,
  FiServer,
} from "react-icons/fi";
import "./ComputerCard.css";
import Zbot_Fields from "../../components/Zbot_Fields";
import DetailsLayout from "../DetailsLayout";
import { listPeople } from "../../data/People/People.Repository";
import { findAll as listOrganisations } from "../../data/Organisation/Organisation.repository";
import {
  createNetworkHardware,
  getNetworkHardwareById,
  updateNetworkHardware,
} from "../../data/NetworkHardware/NetworkHardware.repository.js";
import { addCatalogItem, getCatalogItems } from "../../data/Catalog/Catalog.repository";
import { getWarrantySite } from "../../utils/warrantySites";

const initialForm = {
  deviceName: "",
  serialNumber: "",
  make: "",
  model: "",
  company: "",
  physicalLocation: "On Site",
  deviceType: "",
  macAddress: "",
  managementIp: "",
  portCount: "",
  rackLocation: "",
  firmwareVersion: "",
  owner: "",
  farNumber: "",
  purchaseAmount: "",
  nextAction: "",
  category: "networking",
  status: "Live",
  orgId: "",
};

const STATUS_OPTIONS = ["Live", "Retired", "Broken", "Stolen", "Lost"];
const PHYSICAL_LOCATION_OPTIONS = ["On Site", "In Storage", "At Repairs", "Remote"];
const NEXT_ACTION_OPTIONS = ["Replace", "Reassign", "Dispose"];

export default function NetworkCard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const passedOrgId = location.state?.orgId || "";
  const isCreate = !id || id === "new";
  const scopedOrgId = String(passedOrgId || localStorage.getItem("activeOrgId") || "").trim();

  const [form, setForm] = useState({
    ...initialForm,
    orgId: passedOrgId || localStorage.getItem("activeOrgId") || "",
  });
  const [loading, setLoading] = useState(id && id !== "new");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [peopleOptions, setPeopleOptions] = useState([]);
  const [organisationOptions, setOrganisationOptions] = useState([]);

  const [makeManual, setMakeManual] = useState(false);
  const [modelManual, setModelManual] = useState(false);
  const [makeInput, setMakeInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [makeSuggestions, setMakeSuggestions] = useState([]);
  const [modelSuggestions, setModelSuggestions] = useState([]);
  const debounceRef = useRef({});

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2200);
    return () => clearTimeout(timer);
  }, [toast.show]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(".field")) {
        setMakeSuggestions([]);
        setModelSuggestions([]);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const activeOrg = form.orgId || passedOrgId || localStorage.getItem("activeOrgId") || "";
    if (!activeOrg) return;

    listPeople({ orgId: activeOrg, limit: 1000 })
      .then((res) => setPeopleOptions(res?.rows || res || []))
      .catch(() => setPeopleOptions([]));
  }, [form.orgId, passedOrgId]);

  useEffect(() => {
    async function loadOrganisations() {
      try {
        const res = await listOrganisations();
        setOrganisationOptions(res?.rows || res || []);
      } catch {
        setOrganisationOptions([]);
      }
    }
    loadOrganisations();
  }, []);

  useEffect(() => {
    if (!scopedOrgId || !organisationOptions.length) return;

    const selectedOrg = organisationOptions.find((o) => String(o._id || o.id) === scopedOrgId);
    if (!selectedOrg) return;

    const scopedCompany = selectedOrg.orgName || selectedOrg.tradingAs || "";
    setForm((prev) => {
      if (String(prev.orgId || "") === scopedOrgId && String(prev.company || "") === scopedCompany) return prev;
      return {
        ...prev,
        orgId: scopedOrgId,
        company: scopedCompany,
      };
    });
  }, [scopedOrgId, organisationOptions]);

  const scopedOrganisationOptions = scopedOrgId
    ? organisationOptions.filter((o) => String(o._id || o.id) === scopedOrgId)
    : organisationOptions;

  useEffect(() => {
    if (id && id !== "new") {
      setLoading(true);
      getNetworkHardwareById(id)
        .then((data) => {
          const next = {
            ...initialForm,
            ...data,
            rackLocation: data.rackLocation || data.location || "",
            physicalLocation: PHYSICAL_LOCATION_OPTIONS.includes(data.physicalLocation)
              ? data.physicalLocation
              : PHYSICAL_LOCATION_OPTIONS.includes(data.location)
                ? data.location
                : "On Site",
            nextAction: NEXT_ACTION_OPTIONS.includes(data.nextAction) ? data.nextAction : "",
            firmwareVersion: data.firmwareVersion || "",
            farNumber: data.farNumber || "",
            category: data.category || "networking",
            status: STATUS_OPTIONS.includes(data.status) ? data.status : "Live",
          };

          setForm(next);
          setMakeInput(next.make || "");
          setModelInput(next.model || "");
        })
        .catch(() => setError("Audit Trail Error: Could not retrieve network hardware record."))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #00d4ff",
    borderRadius: "8px",
    zIndex: 9999,
    listStyle: "none",
    padding: 0,
    boxShadow: "0 0 15px rgba(0, 212, 255, 0.4)",
    margin: "4px 0 0 0",
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompanyChange = (e) => {
    const selectedOrgId = e.target.value;
    const selectedOrg = scopedOrganisationOptions.find((o) => String(o._id || o.id) === selectedOrgId);

    setForm((prev) => ({
      ...prev,
      orgId: selectedOrgId,
      company: selectedOrg?.orgName || selectedOrg?.tradingAs || "",
    }));
  };

  const fetchMakeData = (query) => {
    if (debounceRef.current.make) clearTimeout(debounceRef.current.make);
    debounceRef.current.make = setTimeout(async () => {
      try {
        const rows = await getCatalogItems("make", { query: query || "", limit: 20 });
        setMakeSuggestions(
          rows.map((row) => ({
            label: row.value,
            id: row._id || `${row.type}-${row.value}`,
          })),
        );
      } catch {
        setMakeSuggestions([]);
      }
    }, 250);
  };

  const fetchModelData = (query, make) => {
    if (debounceRef.current.model) clearTimeout(debounceRef.current.model);
    debounceRef.current.model = setTimeout(async () => {
      try {
        if (!String(make || "").trim()) {
          setModelSuggestions([]);
          return;
        }

        const rows = await getCatalogItems("model", {
          query: query || "",
          parent: make || "",
          limit: 20,
        });
        setModelSuggestions(
          rows.map((row) => ({
            label: row.value,
            id: row._id || `${row.type}-${row.value}`,
          })),
        );
      } catch {
        setModelSuggestions([]);
      }
    }, 350);
  };

  const persistManualCatalogEntries = async () => {
    const makeValue = String(form.make || "").trim();
    const modelValue = String(form.model || "").trim();

    if (makeManual && makeValue) {
      const existing = await getCatalogItems("make", { query: makeValue, exact: true, limit: 1 });
      if (!existing.length) await addCatalogItem("make", makeValue, null);
    }

    if (modelManual && modelValue) {
      const existing = await getCatalogItems("model", {
        query: modelValue,
        parent: makeValue,
        exact: true,
        limit: 1,
      });
      if (!existing.length) await addCatalogItem("model", modelValue, makeValue);
    }
  };

  const upsertCatalogValue = async (type, value, parent = null) => {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return false;

    const existing = await getCatalogItems(type, {
      query: cleanValue,
      exact: true,
      parent: parent || "",
      limit: 1,
    });

    if (existing.length) return "exists";

    await addCatalogItem(type, cleanValue, parent);
    return "added";
  };

  const handleMakePlus = async () => {
    const value = makeManual ? form.make : makeInput;
    if (!String(value || "").trim()) {
      setMakeManual((prev) => !prev);
      return;
    }

    try {
      setError("");
      const result = await upsertCatalogValue("make", value, null);
      setToast({
        show: true,
        message: result === "added" ? "Make added to catalog." : "Make already exists in catalog.",
        type: "success",
      });
    } catch (e) {
      setToast({ show: true, message: e?.message || "Failed to save make to catalog.", type: "error" });
    }
  };

  const handleModelPlus = async () => {
    const value = modelManual ? form.model : modelInput;
    const parentMake = String(form.make || "").trim();

    if (!String(value || "").trim()) {
      setModelManual((prev) => !prev);
      return;
    }

    if (!parentMake) {
      setError("Select or enter a Make before adding a Model to catalog.");
      return;
    }

    try {
      setError("");
      const result = await upsertCatalogValue("model", value, parentMake);
      setToast({
        show: true,
        message: result === "added" ? "Model added to catalog." : "Model already exists in catalog.",
        type: "success",
      });
    } catch (e) {
      setToast({ show: true, message: e?.message || "Failed to save model to catalog.", type: "error" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const organizationId = String(form.orgId || passedOrgId || localStorage.getItem("activeOrgId") || "").trim();
      if (!organizationId) throw new Error("Compliance: Organization is required.");
      if (!String(form.deviceName || "").trim()) throw new Error("Compliance: Device Name is mandatory.");
      if (!String(form.serialNumber || "").trim()) throw new Error("Compliance: Serial Number is mandatory.");

      await persistManualCatalogEntries();

      const purchaseAmount =
        form.purchaseAmount === "" || form.purchaseAmount === null || form.purchaseAmount === undefined
          ? null
          : Number(form.purchaseAmount);

      const payload = {
        ...form,
        orgId: organizationId,
        organizationId,
        category: "networking",
        deviceName: String(form.deviceName || "").trim(),
        serialNumber: String(form.serialNumber || "").trim(),
        make: String(form.make || "").trim(),
        model: String(form.model || "").trim(),
        company: String(form.company || "").trim(),
        deviceType: String(form.deviceType || "").trim(),
        macAddress: String(form.macAddress || "").trim(),
        managementIp: String(form.managementIp || "").trim(),
        rackLocation: String(form.rackLocation || "").trim(),
        firmwareVersion: String(form.firmwareVersion || "").trim(),
        physicalLocation: String(form.physicalLocation || "On Site").trim(),
        location: String(form.physicalLocation || "On Site").trim(),
        portCount: form.portCount === "" || form.portCount === null || form.portCount === undefined ? null : Number(form.portCount),
        farNumber: String(form.farNumber || "").trim(),
        owner: String(form.owner || "").trim() || null,
        purchaseAmount,
        status: String(form.status || "Live").trim(),
        nextAction: String(form.nextAction || "").trim(),
      };

      if (isCreate) {
        await createNetworkHardware(payload);
        setToast({ show: true, message: "Asset saved successfully.", type: "success" });
      } else {
        await updateNetworkHardware(id, payload);
        setToast({ show: true, message: "Asset saved successfully.", type: "success" });
      }

      setTimeout(() => {
        navigate("/computers");
      }, 900);
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const warrantySite = getWarrantySite(form.make);

  const sidebarContent = (
    <>
      <div className="sideBlock">
        <div className="sideBlock__title">System Vitality</div>
        <div className="summary">
          <div className="summaryRow">
            <div className="summaryLabel">Lifecycle</div>
            <div className="summaryValue">
              <span
                className="pill"
                style={{
                  background: "rgba(34, 197, 94, 0.16)",
                  color: "#15803d",
                }}
              >
                {form.status || "Live"}
              </span>
            </div>
          </div>
          <div className="summaryRow">
            <div className="summaryLabel">Device</div>
            <div className="summaryValue">{form.deviceName || "-"}</div>
          </div>
          <div className="summaryRow">
            <div className="summaryLabel">FAR Number</div>
            <div className="summaryValue">{form.farNumber || "-"}</div>
          </div>
        </div>
      </div>

      <div className="sideBlock">
        <div className="sideBlock__title">Compliance QR</div>
        <div className="qrWrapper" style={{ textAlign: "center", padding: "15px", background: "#fff", borderRadius: "12px" }}>
          <div
            style={{
              background: "#eee",
              width: "100px",
              height: "100px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiServer size={40} color="#ccc" />
          </div>
          <button className="btn-electric btnGhost" style={{ marginTop: "10px", fontSize: "12px" }} onClick={() => window.print()}>
            <span><FiPrinter /> Print Label</span>
          </button>
        </div>
      </div>

      <div className="sideBlock">
        <div className="sideBlock__title">Support Portals</div>
        {warrantySite ? (
          <a className="warrantyLink" href={warrantySite.url} target="_blank" rel="noreferrer">
            <FiGlobe /> {form.make || "Vendor"} Authority Site
          </a>
        ) : (
          <div className="sideBlock__text">No external portal linked for this make.</div>
        )}
      </div>

      <div className="actionBlock" style={{ marginTop: 'auto' }}>
        <button className="btn-electric btnPrimary" onClick={handleSave} disabled={saving}>
          <span>{saving ? "Updating Registry..." : "Commit Asset"}</span>
        </button>
        <button
          className="btn-electric btnGhost"
          style={{
            width: "100%",
            marginTop: "12px",
            borderColor: "#94a3b8",
            color: "#475569",
            background: "transparent",
          }}
          onClick={() => navigate("/computers")}
          disabled={saving}
        >
          <span>Discard Changes</span>
        </button>
      </div>
    </>
  );

  if (loading) return <div className="system-loader">Initialising Managed Environment...</div>;

  return (
    <DetailsLayout
      title={isCreate ? "Register New Network Asset" : `Edit: ${form.deviceName || id}`}
      subtitle={isCreate ? "New Infrastructure Entry" : `Global Asset ID: ${form.serialNumber || id}`}
      sidebarContent={sidebarContent}
      statsLabel1="NET"
      statsLabel2="OPS"
    >
      {toast.show && (
        <div
          style={{
            position: "fixed",
            right: 24,
            top: 24,
            zIndex: 10000,
            background: toast.type === "success" ? "#0f5132" : "#842029",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 8,
            padding: "10px 14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            fontWeight: 700,
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="panel__title">
        <FiMonitor /> Hardware Identification
      </div>
      <div className="fieldGrid">
        <div className="field">
          <Zbot_Fields
            label="Device Name"
            value={form.deviceName}
            onChange={e => setField("deviceName", e.target.value)}
            placeholder="e.g. CORE-SW-01"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Serial Number"
            value={form.serialNumber}
            onChange={e => setField("serialNumber", e.target.value)}
            placeholder="Required for audit"
            className="value"
          />
        </div>

        <div className="field">
          <div className="label">Make (Catalog Search)</div>
          <div style={{ display: "flex", gap: 10, position: "relative" }}>
            {!makeManual ? (
              <div style={{ flex: 1, position: "relative" }}>
                <Zbot_Fields
                  value={makeInput}
                  onChange={e => {
                    setMakeInput(e.target.value);
                    setField("make", e.target.value);
                    setField("model", "");
                    setModelInput("");
                    setModelSuggestions([]);
                    fetchMakeData(e.target.value);
                  }}
                  placeholder="Search Brands (Cisco, HPE)..."
                  className="value"
                />
                {makeSuggestions.length > 0 && (
                  <ul style={dropdownStyle}>
                    {makeSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        style={{
                          padding: "12px",
                          cursor: "pointer",
                          color: "#fff",
                          borderBottom: "1px solid #222",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#5b4bd6")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        onClick={() => {
                          setField("make", suggestion.label);
                          setField("model", "");
                          setMakeInput(suggestion.label);
                          setModelInput("");
                          setMakeSuggestions([]);
                          setModelSuggestions([]);
                        }}
                      >
                        {suggestion.label} <FiCheckCircle size={12} style={{ marginLeft: 8, color: "#00d4ff" }} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <Zbot_Fields
                value={form.make}
                onChange={e => setField("make", e.target.value)}
                placeholder="Manual entry..."
                className="value"
              />
            )}
            <button
              type="button"
              className="btn-electric btnPrimary"
              style={{ borderRadius: "50%", width: 35, height: 35, padding: 0 }}
              onClick={handleMakePlus}
            >
              <span><FiPlus /></span>
            </button>
          </div>
        </div>

        <div className="field">
          <div className="label">Model (Catalog Search)</div>
          <div style={{ display: "flex", gap: 10, position: "relative" }}>
            {!modelManual ? (
              <div style={{ flex: 1, position: "relative" }}>
                <Zbot_Fields
                  value={modelInput}
                  onChange={e => {
                    setModelInput(e.target.value);
                    setField("model", e.target.value);
                    fetchModelData(e.target.value, form.make);
                  }}
                  placeholder="Search model..."
                  className="value"
                  disabled={!form.make}
                />
                {modelSuggestions.length > 0 && (
                  <ul style={dropdownStyle}>
                    {modelSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        style={{
                          padding: "12px",
                          cursor: "pointer",
                          color: "#fff",
                          borderBottom: "1px solid #222",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#5b4bd6")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        onClick={() => {
                          setField("model", suggestion.label);
                          setModelInput(suggestion.label);
                          setModelSuggestions([]);
                        }}
                      >
                        {suggestion.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <Zbot_Fields
                value={form.model}
                onChange={e => setField("model", e.target.value)}
                placeholder="Manual entry..."
                className="value"
              />
            )}
            <button
              type="button"
              className="btn-electric btnPrimary"
              style={{ borderRadius: "50%", width: 35, height: 35, padding: 0 }}
              onClick={handleModelPlus}
            >
              <span><FiPlus /></span>
            </button>
          </div>
        </div>
      </div>

      <div className="panel__title" style={{ marginTop: 40 }}>
        <FiCpu /> Technical Specifications
      </div>
      <div className="fieldGrid">
        <div className="field">
          <Zbot_Fields
            label="Device Type"
            value={form.deviceType}
            onChange={e => setField("deviceType", e.target.value)}
            placeholder="e.g. Core Switch"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Management IP"
            value={form.managementIp}
            onChange={e => setField("managementIp", e.target.value)}
            placeholder="e.g. 10.10.0.1"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="MAC Address"
            value={form.macAddress}
            onChange={e => setField("macAddress", e.target.value)}
            placeholder="e.g. 00:1A:2B:3C:4D:5E"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Port Count"
            type="number"
            min={0}
            value={form.portCount}
            onChange={e => setField("portCount", e.target.value)}
            placeholder="e.g. 48"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Rack Location"
            value={form.rackLocation}
            onChange={e => setField("rackLocation", e.target.value)}
            placeholder="e.g. DC Rack R12-U24"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Firmware Version"
            value={form.firmwareVersion}
            onChange={e => setField("firmwareVersion", e.target.value)}
            placeholder="e.g. 17.09.03"
            className="value"
          />
        </div>
      </div>

      <div className="panel__title" style={{ marginTop: 40 }}>
        <FiMonitor /> Governance & Ownership
      </div>
      <div className="fieldGrid">
        <div className="field">
          <div className="label">Managing Company</div>
          <select className="value" value={form.orgId || ""} onChange={handleCompanyChange} disabled={Boolean(scopedOrgId)}>
            <option value="">Select company</option>
            {scopedOrganisationOptions.map((o) => {
              const orgId = o._id || o.id;
              const tradingAs = o.orgName || o.tradingAs || "Unnamed Organisation";
              return (
                <option key={orgId} value={orgId}>
                  {tradingAs}
                </option>
              );
            })}
            {form.company && !scopedOrganisationOptions.some((o) => String(o._id || o.id) === String(form.orgId || "")) ? (
              <option value={form.orgId || ""}>{form.company}</option>
            ) : null}
          </select>
        </div>
        <div className="field">
          <div className="label">Physical Location</div>
          <select className="value" value={form.physicalLocation || "On Site"} onChange={(e) => setField("physicalLocation", e.target.value)}>
            {PHYSICAL_LOCATION_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <Zbot_Fields
            label="Asset Value (ZAR)"
            type="number"
            step="0.01"
            value={form.purchaseAmount}
            onChange={e => setField("purchaseAmount", e.target.value)}
            placeholder="0.00"
            className="value"
          />
        </div>
        <div className="field">
          <div className="label">Owner</div>
          <select className="value" value={form.owner} onChange={(e) => setField("owner", e.target.value)}>
            <option value="">Unassigned</option>
            {peopleOptions.map((person) => (
              <option key={person.id || person._id} value={person.id || person._id}>
                {person.displayName || person.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Zbot_Fields
            label="FAR Number"
            value={form.farNumber}
            onChange={e => setField("farNumber", e.target.value)}
            placeholder="Fixed Asset ID"
            className="value"
          />
        </div>
        <div className="field">
          <div className="label">Current Status</div>
          <select className="value" value={form.status || "Live"} onChange={(e) => setField("status", e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">Next Action</div>
          <select className="value" value={form.nextAction || ""} onChange={(e) => setField("nextAction", e.target.value)}>
            <option value="">Select next action</option>
            {NEXT_ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          className="audit-alert"
          style={{
            background: "rgba(255, 77, 79, 0.1)",
            border: "1px solid #ff4d4f",
            padding: "15px",
            borderRadius: "8px",
            marginTop: "30px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            color: "#ff4d4f",
            fontWeight: "bold",
          }}
        >
          <FiAlertTriangle /> {error}
        </div>
      )}
    </DetailsLayout>
  );
}