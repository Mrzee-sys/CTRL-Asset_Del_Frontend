import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCloud,
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
import { createServer, updateServer, getServerById } from "../../data/Server/Server.repository.js";
import { addCatalogItem, getCatalogItems } from "../../data/Catalog/Catalog.repository";
import { getWarrantySite } from "../../utils/warrantySites";

const initialForm = {
  hostname: "",
  cpu: "",
  ram: "",
  os: "",
  serverRole: "",
  ipAddress: "",
  farNumber: "",
  serialNumber: "",
  make: "",
  model: "",
  company: "",
  physicalLocation: "On Site",
  owner: "",
  purchaseAmount: "",
  monthlyCost: "",
  warrantyDate: "",
  nextAction: "",
  category: "server",
  status: "Live",
  orgId: "",
  isVM: false,
  hostProvider: "",
  cloudInstanceId: "",
  region: "",
  hostPhysicalServer: "",
};

const hostProviderOptions = [
  "Azure",
  "AWS",
  "Hetzner",
  "Google Cloud (GCP)",
  "DigitalOcean",
  "On-Premise (Hyper-V)",
  "On-Premise (VMware)",
];

const CPU_OPTIONS = ["1 vCPU", "2 vCPU", "4 vCPU", "6 vCPU", "8 vCPU", "12 vCPU", "16 vCPU", "24 vCPU", "32 vCPU", "64 vCPU"];
const RAM_OPTIONS = ["2 GB", "4 GB", "8 GB", "16 GB", "32 GB", "64 GB", "128 GB", "256 GB", "512 GB"];
const SERVER_OS_OPTIONS = [
  "Windows Server 2022",
  "Windows Server 2019",
  "Windows Server 2016",
  "Windows Server 2012 R2",
  "Ubuntu Server 24.04 LTS",
  "Ubuntu Server 22.04 LTS",
  "Red Hat Enterprise Linux (RHEL) 9",
  "Red Hat Enterprise Linux (RHEL) 8",
  "Debian 12 (Bookworm)",
  "Rocky Linux 9",
  "AlmaLinux 9",
  "SUSE Linux Enterprise Server (SLES) 15",
  "Oracle Linux 9",
  "FreeBSD 14.0",
  "VMware ESXi 8.0 (Hypervisor OS)",
  "Amazon Linux 2023",
];
const SERVER_ROLE_OPTIONS = [
  "File Server",
  "Application Server",
  "Mail Server",
  "Print Server",
  "Virtualization Host (Hypervisor)",
  "Backup Server",
  "DHCP / DNS Server",
  "Remote Desktop Server (RDS)",
  "Proxy / Gateway Server",
  "Monitoring / Management Server",
  "Storage (SAN/NAS) Controller",
];

const STATUS_OPTIONS = ["Live", "Retired", "Broken", "Stolen", "Lost"];
const PHYSICAL_LOCATION_OPTIONS = ["On Site", "In Storage", "At Repairs", "Remote"];
const NEXT_ACTION_OPTIONS = ["Replace", "Reassign", "Dispose"];

function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function ServerCard() {
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

  const isOnPrem = String(form.hostProvider || "").startsWith("On-Premise");

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
      getServerById(id)
        .then((data) => {
          const vmRecord = Boolean(data.isVM);
          const normalizedStatus = STATUS_OPTIONS.includes(data.status) ? data.status : "Live";
          const normalizedPhysicalLocation = PHYSICAL_LOCATION_OPTIONS.includes(data.physicalLocation)
            ? data.physicalLocation
            : PHYSICAL_LOCATION_OPTIONS.includes(data.location)
              ? data.location
              : "On Site";
          const normalizedNextAction = NEXT_ACTION_OPTIONS.includes(data.nextAction)
            ? data.nextAction
            : "";
          const next = {
            ...initialForm,
            ...data,
            hostname: data.hostname || data.serverName || "",
            farNumber: data.farNumber || data.serviceTag || "",
            serverRole: data.serverRole || "",
            isVM: vmRecord,
            category: data.category || "server",
            status: normalizedStatus,
            physicalLocation: normalizedPhysicalLocation,
            nextAction: normalizedNextAction,
            warrantyDate: toDateInputValue(data.warrantyDate),
            purchaseAmount: vmRecord ? "" : (data.purchaseAmount ?? ""),
            monthlyCost: vmRecord ? (data.monthlyCost ?? data.purchaseAmount ?? "") : (data.monthlyCost ?? ""),
          };

          setForm(next);
          setMakeInput(next.make || "");
          setModelInput(next.model || "");
        })
        .catch(() => setError("Audit Trail Error: Could not retrieve server record."))
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
      if (!String(form.hostname || "").trim()) throw new Error("Compliance: Hostname is mandatory.");
      if (!String(form.serialNumber || "").trim()) throw new Error("Compliance: Serial Number is mandatory.");
      if (form.isVM && !String(form.hostProvider || "").trim()) {
        throw new Error("Audit Rule: Host Provider is required for virtual appliances.");
      }

      await persistManualCatalogEntries();

      const purchaseAmount =
        form.purchaseAmount === "" || form.purchaseAmount === null || form.purchaseAmount === undefined
          ? null
          : Number(form.purchaseAmount);

      const monthlyCost =
        form.monthlyCost === "" || form.monthlyCost === null || form.monthlyCost === undefined
          ? null
          : Number(form.monthlyCost);

      const payload = {
        ...form,
        orgId: organizationId,
        organizationId,
        serverName: String(form.hostname || "").trim(),
        hostname: String(form.hostname || "").trim(),
        category: "server",
        serialNumber: String(form.serialNumber || "").trim(),
        make: String(form.make || "").trim(),
        model: String(form.model || "").trim(),
        company: String(form.company || "").trim(),
        cpu: String(form.cpu || "").trim(),
        ram: String(form.ram || "").trim(),
        os: String(form.os || "").trim(),
        serverRole: String(form.serverRole || "").trim(),
        ipAddress: String(form.ipAddress || "").trim(),
        physicalLocation: String(form.physicalLocation || "On Site").trim(),
        location: String(form.physicalLocation || "On Site").trim(),
        farNumber: String(form.farNumber || "").trim(),
        owner: String(form.owner || "").trim() || null,
        warrantyDate: form.warrantyDate ? new Date(form.warrantyDate) : null,
        purchaseAmount: form.isVM ? monthlyCost : purchaseAmount,
        monthlyCost: form.isVM ? monthlyCost : null,
        billingType: form.isVM ? "monthly" : "once_off",
        status: String(form.status || "Live").trim(),
        nextAction: String(form.nextAction || "").trim(),
        isVM: Boolean(form.isVM),
        hostProvider: String(form.hostProvider || "").trim(),
        cloudInstanceId: String(form.cloudInstanceId || "").trim(),
        region: String(form.region || "").trim(),
        hostPhysicalServer: isOnPrem ? String(form.hostPhysicalServer || "").trim() : "",
      };

      if (isCreate) {
        await createServer(payload);
        setToast({ show: true, message: "Asset saved successfully.", type: "success" });
      } else {
        await updateServer(id, payload);
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

  const lifecycleValue = form.isVM ? "Virtual Appliance Hosted" : "Live";
  const costLabel = form.isVM ? "Monthly Cost" : "Asset Value";
  const costValue = form.isVM ? form.monthlyCost : form.purchaseAmount;
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
                  background: form.isVM ? "rgba(0, 212, 255, 0.18)" : "rgba(34, 197, 94, 0.16)",
                  color: form.isVM ? "#0891b2" : "#15803d",
                }}
              >
                {lifecycleValue}
              </span>
            </div>
          </div>
          <div className="summaryRow">
            <div className="summaryLabel">Hostname</div>
            <div className="summaryValue">{form.hostname || "-"}</div>
          </div>
          <div className="summaryRow">
            <div className="summaryLabel">Server Role</div>
            <div className="summaryValue">{form.serverRole || "-"}</div>
          </div>
          <div className="summaryRow">
            <div className="summaryLabel">{costLabel}</div>
            <div className="summaryValue">
              {costValue ? `R ${Number(costValue).toLocaleString()}` : "-"}
              {form.isVM ? " /month" : ""}
            </div>
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
      title={isCreate ? "Register New Server" : `Edit: ${form.hostname || id}`}
      subtitle={isCreate ? "New Infrastructure Entry" : `Global Asset ID: ${form.serialNumber || id}`}
      sidebarContent={sidebarContent}
      statsLabel1="SRV"
      statsLabel2="VA"
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
        <div className="field fieldFull">
          <div className="label">Virtual Appliance?</div>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: 6,
              borderRadius: 999,
              border: "1px solid rgba(91, 75, 214, 0.35)",
              background: "rgba(91, 75, 214, 0.08)",
            }}
          >
            <button
              type="button"
              className="btn-electric"
              style={{
                height: 34,
                padding: "0 16px",
                borderRadius: 999,
                background: !form.isVM ? "#5b4bd6" : "#ffffff",
                color: !form.isVM ? "#fff" : "#475569",
                border: !form.isVM ? "1px solid #5b4bd6" : "1px solid #cbd5e1",
                boxShadow: !form.isVM ? "0 8px 18px rgba(91, 75, 214, 0.2)" : "none",
              }}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  isVM: false,
                  monthlyCost: "",
                  hostProvider: "",
                  cloudInstanceId: "",
                  region: "",
                  hostPhysicalServer: "",
                  status: "Live",
                }))
              }
            >
              <span>No</span>
            </button>
            <button
              type="button"
              className="btn-electric"
              style={{
                height: 34,
                padding: "0 16px",
                borderRadius: 999,
                background: form.isVM ? "linear-gradient(90deg, #5b4bd6, #00d4ff)" : "#ffffff",
                color: form.isVM ? "#fff" : "#475569",
                border: form.isVM ? "1px solid transparent" : "1px solid #cbd5e1",
                boxShadow: form.isVM ? "0 8px 18px rgba(0, 212, 255, 0.24)" : "none",
              }}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  isVM: true,
                  purchaseAmount: "",
                }))
              }
            >
              <span>Yes</span>
            </button>
          </div>
        </div>

        <div className="field">
          <Zbot_Fields
            label="Hostname"
            value={form.hostname}
            onChange={e => setField("hostname", e.target.value)}
            placeholder="e.g. DC-PROD-01"
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
                  placeholder="Search Brands (Dell, HP)..."
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
                  placeholder="Search Model (PowerEdge, ProLiant)..."
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

      {form.isVM && (
        <>
          <div className="panel__title" style={{ marginTop: 32 }}>
            <FiCloud /> Cloud & Virtualization Details
          </div>
          <div className="fieldGrid">
            <div className="field">
              <div className="label">Host Provider *</div>
              <select className="value" value={form.hostProvider} onChange={(e) => setField("hostProvider", e.target.value)}>
                <option value="">Select Host Provider...</option>
                {hostProviderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="label">Instance / Account ID</div>
              <input
                className="value"
                value={form.cloudInstanceId}
                onChange={(e) => setField("cloudInstanceId", e.target.value)}
                placeholder="e.g. sub-9876a1 or acct-123"
              />
            </div>

            <div className="field">
              <div className="label">Region / Data Center</div>
              <input
                className="value"
                value={form.region}
                onChange={(e) => setField("region", e.target.value)}
                placeholder="e.g. West Europe, ZA-North"
              />
            </div>

            {isOnPrem && (
              <div className="field">
                <div className="label">Host Physical Server</div>
                <input
                  className="value"
                  value={form.hostPhysicalServer}
                  onChange={(e) => setField("hostPhysicalServer", e.target.value)}
                  placeholder="e.g. HYPERV-HOST-01"
                />
              </div>
            )}
          </div>
        </>
      )}

      <div className="panel__title" style={{ marginTop: 40 }}>
        <FiCpu /> Technical Specifications
      </div>
      <div className="fieldGrid">
        <div className="field">
          <div className="label">CPU</div>
          <select className="value" value={form.cpu || ""} onChange={(e) => setField("cpu", e.target.value)}>
            <option value="">Select CPU</option>
            {CPU_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">RAM</div>
          <select className="value" value={form.ram || ""} onChange={(e) => setField("ram", e.target.value)}>
            <option value="">Select RAM</option>
            {RAM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">Operating System</div>
          <select className="value" value={form.os || ""} onChange={(e) => setField("os", e.target.value)}>
            <option value="">Select Operating System</option>
            {SERVER_OS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <div className="label">Server Role</div>
          <select className="value" value={form.serverRole || ""} onChange={(e) => setField("serverRole", e.target.value)}>
            <option value="">Select Server Role</option>
            {SERVER_ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Zbot_Fields
            label="IP Address"
            value={form.ipAddress}
            onChange={e => setField("ipAddress", e.target.value)}
            placeholder="e.g. 10.0.0.22"
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
            label={form.isVM ? "Monthly Cost (ZAR / month)" : "Asset Value (ZAR)"}
            type="number"
            step="0.01"
            value={form.isVM ? form.monthlyCost : form.purchaseAmount}
            onChange={e => setField(form.isVM ? "monthlyCost" : "purchaseAmount", e.target.value)}
            placeholder="0.00"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Warranty Date"
            type="date"
            value={form.warrantyDate || ""}
            onChange={e => setField("warrantyDate", e.target.value)}
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