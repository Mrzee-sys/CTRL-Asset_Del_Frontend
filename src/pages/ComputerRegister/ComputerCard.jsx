import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  FiPlus, FiPrinter, FiShield, FiAlertTriangle, 
  FiMonitor, FiCpu, FiServer, FiGlobe, FiCheckCircle 
} from "react-icons/fi";

// Layout & Context
import DetailsLayout from "../DetailsLayout";
import { listPeople } from "../../data/People/People.Repository";
import { findAll as listOrganisations } from "../../data/Organisation/Organisation.repository";
import { getComputerById, createComputer, updateComputer } from "../../data/Computer/Computer.repository.js";
import { getCatalogItems, addCatalogItem } from "../../data/Catalog/Catalog.repository";

// Utilities
import { getWarrantySite } from "../../utils/warrantySites";

// Components

import AssetQRCode from "../../components/AssetQRCode";
import Zbot_Fields from "../../components/Zbot_Fields";

const initialForm = {
  computerName: "",
  serialNumber: "",
  assetTag: "",
  make: "",
  model: "",
  farNumber: "",
  os: "",
  osVersion: "",
  company: "",
  physicalLocation: "On Site",
  datePurchased: "",
  warrantyDate: "",
  purchaseAmount: "",
  owner: "",
  previousOwner: "",
  nextAction: "",
  category: "computer",
  status: "Live",
  orgId: "",
  notes: ""
};

const STATUS_OPTIONS = ["Live", "Retired", "Broken", "Stolen", "Lost", "Spare", "To Be Disposed"];
const PHYSICAL_LOCATION_OPTIONS = ["On Site", "In Storage", "At Repairs", "Remote"];
const NEXT_ACTION_OPTIONS = ["Replace", "Reassign", "Dispose", "Monitor"];

function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getPersonId(person) {
  return String(person?.id || person?._id || "").trim();
}

function getPersonLabel(person) {
  const explicit = String(person?.displayName || person?.name || "").trim();
  if (explicit) return explicit;
  const full = `${String(person?.firstName || "").trim()} ${String(person?.lastName || "").trim()}`.trim();
  if (full) return full;
  return String(person?.email || "").trim();
}

function getOwnerDirectoryLabel(person) {
  return String(person?.displayName || person?.name || getPersonLabel(person) || "").trim();
}

function getOrganisationId(value) {
  return String(value?.orgId || value?.organizationId || value?._id || value?.id || "").trim();
}

function getOrganisationFriendlyName(value) {
  return String(
    value?.orgName || value?.tradingAs || value?.name || value?.label || value?.company || ""
  ).trim();
}

function parseCurrencyValue(value) {
  const digitsOnly = String(value || "").replace(/[^\d.]/g, "");
  const normalized = digitsOnly.replace(/\.(?=.*\.)/g, "");
  if (!normalized) return "";

  const [wholePart = "", decimalPart = ""] = normalized.split(".");
  const limitedDecimals = decimalPart.slice(0, 2);
  return limitedDecimals ? `${wholePart}.${limitedDecimals}` : wholePart;
}

function formatCurrencyValue(value) {
  const normalized = parseCurrencyValue(value);
  if (!normalized) return "";

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return "";

  return `R${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calculateLiveCurrentValue(costInput, purchaseDateInput) {
  const cost = Number(costInput);
  if (!Number.isFinite(cost) || cost < 0) return 0;

  const parsedPurchaseDate = purchaseDateInput ? new Date(purchaseDateInput) : null;
  const hasValidPurchaseDate = parsedPurchaseDate && Number.isFinite(parsedPurchaseDate.getTime());
  const ageInYears = hasValidPurchaseDate
    ? Math.max(0, (Date.now() - parsedPurchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : 0;

  return Math.max(0, cost - ((cost / 3) * ageInYears));
}

function calculateAssetAgeYears(purchaseDateInput) {
  const parsedPurchaseDate = purchaseDateInput ? new Date(purchaseDateInput) : null;
  if (!parsedPurchaseDate || !Number.isFinite(parsedPurchaseDate.getTime())) return null;

  const elapsedMs = Date.now() - parsedPurchaseDate.getTime();
  if (elapsedMs < 0) return 0;

  return elapsedMs / (1000 * 60 * 60 * 24 * 365.25);
}

export default function ComputerCard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const passedOrgId = location.state?.orgId || "";
  const passedCategory = location.state?.category || "";
  const isCreate = !id || id === "new";
  const scopedOrgId = String(passedOrgId || localStorage.getItem("activeOrgId") || "").trim();

  // --- Core State Management ---
  const [form, setForm] = useState({ ...initialForm, orgId: passedOrgId });
  const [loading, setLoading] = useState(id && id !== "new");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [peopleOptions, setPeopleOptions] = useState([]);
  const [ownerDirectory, setOwnerDirectory] = useState([]);
  const [organisationOptions, setOrganisationOptions] = useState([]);
  const [computer, setComputer] = useState(null);
  const [osData, setOsData] = useState(null); 

  // --- Smart Field & Search States ---
  const [makeManual, setMakeManual] = useState(false);
  const [modelManual, setModelManual] = useState(false);
  const [osManual, setOsManual] = useState(false);
  const [makeInput, setMakeInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [osInput, setOsInput] = useState("");
  const [makeSuggestions, setMakeSuggestions] = useState([]);
  const [modelSuggestions, setModelSuggestions] = useState([]);
  const [osSuggestions, setOsSuggestions] = useState([]);
  const [ownerInput, setOwnerInput] = useState("");
  const [previousOwnerInput, setPreviousOwnerInput] = useState("");
  const [ownerSuggestions, setOwnerSuggestions] = useState([]);
  const [previousOwnerSuggestions, setPreviousOwnerSuggestions] = useState([]);
  const [purchaseAmountInput, setPurchaseAmountInput] = useState("");
  const [liveCurrentValue, setLiveCurrentValue] = useState(0);
  const debounceRef = useRef({});

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2200);
    return () => clearTimeout(timer);
  }, [toast.show]);

  // --- 1. Dropdown UI Closer ---
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.field')) {
        setMakeSuggestions([]);
        setModelSuggestions([]);
        setOsSuggestions([]);
        setOwnerSuggestions([]);
        setPreviousOwnerSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 2. Load Initial Record ---
  useEffect(() => {
    if (id && id !== "new") {
      setLoading(true);
      getComputerById(id)
        .then((data) => {
          setComputer(data);
          const normalizedOrgId = getOrganisationId(data);
          const normalizedStatus = STATUS_OPTIONS.includes(data.status) ? data.status : "Live";
          const normalizedPhysicalLocation = PHYSICAL_LOCATION_OPTIONS.includes(data.physicalLocation)
            ? data.physicalLocation
            : PHYSICAL_LOCATION_OPTIONS.includes(data.location)
              ? data.location
              : "On Site";
          const normalizedNextAction = NEXT_ACTION_OPTIONS.includes(data.nextAction)
            ? data.nextAction
            : "";
          const purchaseAmountCandidate = data.purchaseAmount ?? data.costZAR;
          const purchaseDateCandidate = data.datePurchased || data.purchaseDate || data.createdAt;
          const loadedCurrentValue = calculateLiveCurrentValue(purchaseAmountCandidate, purchaseDateCandidate);
          const loadedAssetAgeYears = calculateAssetAgeYears(purchaseDateCandidate);
          const shouldAutoReplace = loadedCurrentValue <= 0
            || (Number.isFinite(loadedAssetAgeYears) && loadedAssetAgeYears >= 5);

          setForm({
            ...initialForm,
            ...data,
            orgId: normalizedOrgId || String(passedOrgId || "").trim(),
            company: data.orgName || data.tradingAs || data.organizationName || data.company || getOrganisationFriendlyName(data),
            purchaseAmount: purchaseAmountCandidate ?? "",
            status: normalizedStatus,
            physicalLocation: normalizedPhysicalLocation,
            nextAction: shouldAutoReplace ? "Replace" : normalizedNextAction,
            datePurchased: toDateInputValue(data.datePurchased || data.purchaseDate),
            warrantyDate: toDateInputValue(data.warrantyDate),
          });
          setPurchaseAmountInput(formatCurrencyValue(purchaseAmountCandidate));
          setLiveCurrentValue(loadedCurrentValue);
          setMakeInput(data.make || "");
          setModelInput(data.model || "");
          setOsInput(data.os || "");
          
          // Populate owner and previousOwner display names
          if (data.owner) {
            const ownerValue = String(data.owner || "").trim();
            const ownerPerson = peopleOptions.find((p) => {
              if (getPersonId(p) === ownerValue) return true;
              const label = getPersonLabel(p).toLowerCase();
              const email = String(p?.email || "").trim().toLowerCase();
              return label === ownerValue.toLowerCase() || email === ownerValue.toLowerCase();
            });
            const ownerFallback = ownerDirectory.find((p) => {
              if (getPersonId(p) === ownerValue) return true;
              return getOwnerDirectoryLabel(p).toLowerCase() === ownerValue.toLowerCase();
            });
            setOwnerInput(
              ownerPerson
                ? getPersonLabel(ownerPerson)
                : ownerFallback
                  ? getOwnerDirectoryLabel(ownerFallback)
                  : String(data.owner || "")
            );
          }
          if (data.previousOwner) {
            const prevOwnerPerson = peopleOptions.find((p) => getPersonId(p) === String(data.previousOwner || "").trim());
            setPreviousOwnerInput(prevOwnerPerson ? getPersonLabel(prevOwnerPerson) : "");
          }
        })
        .catch(() => setError("Registry Error: Data retrieval failed."))
        .finally(() => setLoading(false));
    }
  }, [id, peopleOptions, ownerDirectory]);

  // --- 3. Fetch People for Org ---
  useEffect(() => {
    const activeOrg = form.orgId || passedOrgId;
    if (!activeOrg) {
      setPeopleOptions([]);
      setOwnerDirectory([]);
      return;
    }
    listPeople({ orgId: activeOrg, limit: 1000 })
      .then(res => setPeopleOptions(res?.rows || []));

    const API_BASE =
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
      "http://localhost:5000";

    const token = localStorage.getItem("token") || "";
    fetch(`${API_BASE}/api/people/merged?orgId=${encodeURIComponent(activeOrg)}`, {
      headers: {
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    })
      .then((res) => (res.ok ? res.json() : { rows: [] }))
      .then((data) => setOwnerDirectory(Array.isArray(data?.rows) ? data.rows : []))
      .catch(() => setOwnerDirectory([]));
  }, [form.orgId, passedOrgId]);

  // --- 3b. Fetch Organisations for company dropdown ---
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

  const organisationFriendlyName = useMemo(() => {
    const selectedOrgId = String(
      form.orgId ||
      form.organizationId ||
      computer?.orgId ||
      computer?.organizationId ||
      computer?.id ||
      passedOrgId ||
      scopedOrgId ||
      ""
    ).trim();
    
    if (!selectedOrgId) {
      return getOrganisationFriendlyName(form) || getOrganisationFriendlyName(computer) || "";
    }

    // Try to find in organisationOptions
    if (organisationOptions && organisationOptions.length > 0) {
      const selectedOrg = organisationOptions.find((o) => {
        const oId = String(o._id || o.id || o.orgId || "").trim();
        return oId === selectedOrgId;
      });
      
      if (selectedOrg) {
        return getOrganisationFriendlyName(selectedOrg);
      }
    }
    
    // Fallback to form or computer data
    return getOrganisationFriendlyName(form) || getOrganisationFriendlyName(computer) || "";
  }, [computer, form, organisationOptions, passedOrgId, scopedOrgId]);

  const ownerExistsInCurrentOrg = useMemo(() => {
    const ownerValue = String(form.owner || "").trim();
    if (!ownerValue) return true;

    const ownerLower = ownerValue.toLowerCase();
    return peopleOptions.some((person) => {
      const personId = getPersonId(person);
      if (personId && personId === ownerValue) return true;

      const personLabel = getPersonLabel(person).toLowerCase();
      const personEmail = String(person?.email || "").trim().toLowerCase();
      return personLabel === ownerLower || personEmail === ownerLower;
    });
  }, [form.owner, peopleOptions]);

  const ownerStoredInAbandonedPep = useMemo(() => {
    const ownerValue = String(form.owner || "").trim().toLowerCase();
    if (!ownerValue) return false;

    return ownerDirectory.some((entry) => {
      if (String(entry?.source || "") !== "abandonedPep") return false;
      const label = getOwnerDirectoryLabel(entry).toLowerCase();
      return label === ownerValue;
    });
  }, [form.owner, ownerDirectory]);

  const showOwnerAuditWarning = Boolean(String(form.owner || "").trim())
    && Boolean(form.orgId || passedOrgId)
    && peopleOptions.length > 0
    && !ownerExistsInCurrentOrg;

  const assetAgeYears = useMemo(() => {
    const dateCandidates = [
      form.datePurchased,
      computer?.datePurchased,
      computer?.purchaseDate,
      computer?.createdAt,
    ];

    const source = dateCandidates.find((value) => {
      if (!value) return false;
      const parsed = new Date(value);
      return Number.isFinite(parsed.getTime());
    });

    if (!source) return null;

    const purchasedOn = new Date(source);
    const now = new Date();
    const elapsedMs = now.getTime() - purchasedOn.getTime();
    if (elapsedMs < 0) return 0;

    return elapsedMs / (1000 * 60 * 60 * 24 * 365.25);
  }, [form.datePurchased, computer]);

  const assetAgeLabel = useMemo(() => {
    if (!Number.isFinite(assetAgeYears)) return "-";
    return `${assetAgeYears.toFixed(1)} years`;
  }, [assetAgeYears]);

  useEffect(() => {
    const purchaseAmountCandidate = form.purchaseAmount ?? computer?.purchaseAmount ?? computer?.costZAR;
    const purchaseDateCandidate =
      form.datePurchased || computer?.datePurchased || computer?.purchaseDate || computer?.createdAt;

    setLiveCurrentValue(calculateLiveCurrentValue(purchaseAmountCandidate, purchaseDateCandidate));
  }, [
    form.purchaseAmount,
    form.datePurchased,
    computer?.purchaseAmount,
    computer?.costZAR,
    computer?.datePurchased,
    computer?.purchaseDate,
    computer?.createdAt,
  ]);

  const currentValueLabel = useMemo(() => {
    const numericCurrentValue = Number(liveCurrentValue);
    if (!Number.isFinite(numericCurrentValue)) return "-";

    return `R${numericCurrentValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [liveCurrentValue]);

  // --- 4. Logic: Brand Search (Now uses Service) ---
  const fetchBrandData = (query) => {
    if (debounceRef.current.make) clearTimeout(debounceRef.current.make);

    debounceRef.current.make = setTimeout(async () => {
      try {
        const rows = await getCatalogItems("make", { query: query || "", limit: 20 });
        const results = rows.map((row) => ({
          label: row.value,
          id: row._id || `${row.type}-${row.value}`,
        }));
        setMakeSuggestions(results);
      } catch {
        setMakeSuggestions([]);
      }
    }, 250);
  };

  // --- 5. Logic: Model Search (Now uses Service) ---
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
        const results = rows.map((row) => ({
          label: row.value,
          id: row._id || `${row.type}-${row.value}`,
          eol: null,
        }));
        setModelSuggestions(results);
      } catch {
        setModelSuggestions([]);
      }
    }, 350);
  };

  // --- 6. Logic: OS Search (Now uses Service) ---
  const fetchOSData = (query) => {
    if (debounceRef.current.os) clearTimeout(debounceRef.current.os);
    debounceRef.current.os = setTimeout(async () => {
      try {
        const rows = await getCatalogItems("os", {
          query: query || "",
          limit: 20,
        });
        const results = rows.map((row) => ({
          label: row.value,
          id: row._id || `${row.type}-${row.value}`,
          eol: null,
        }));
        setOsSuggestions(results);
      } catch {
        setOsSuggestions([]);
      }
    }, 350);
  };

  // --- 7. Logic: Owner Search ---
  const filterOwnerSuggestions = (query) => {
    const searchTerm = query.toLowerCase().trim();
    const filtered = peopleOptions.filter(p => {
      const personId = getPersonId(p);
      const name = getPersonLabel(p).toLowerCase();
      const email = (p.email || "").toLowerCase();

      // Prevent blank rows in the dropdown.
      if (!personId && !name && !email) return false;

      if (!searchTerm) return true;
      return name.includes(searchTerm) || email.includes(searchTerm);
    });
    setOwnerSuggestions(filtered.slice(0, 20));
  };

  // --- 8. Logic: Previous Owner Search ---
  const filterPreviousOwnerSuggestions = (query) => {
    if (!query.trim()) {
      setPreviousOwnerSuggestions([]);
      return;
    }
    const filtered = peopleOptions.filter(p => {
      const name = getPersonLabel(p).toLowerCase();
      const email = (p.email || "").toLowerCase();
      const searchTerm = query.toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    });
    setPreviousOwnerSuggestions(filtered);
  };

  const persistManualCatalogEntries = async () => {
    const makeValue = String(form.make || "").trim();
    const modelValue = String(form.model || "").trim();
    const osValue = String(form.os || "").trim();

    if (makeManual && makeValue) {
      const existing = await getCatalogItems("make", { query: makeValue, exact: true, limit: 1 });
      if (!existing.length) await addCatalogItem("make", makeValue, null);
    }

    if (modelManual && modelValue) {
      const existing = await getCatalogItems("model", { query: modelValue, parent: makeValue, exact: true, limit: 1 });
      if (!existing.length) await addCatalogItem("model", modelValue, makeValue);
    }

    if (osManual && osValue) {
      const existing = await getCatalogItems("os", { query: osValue, exact: true, limit: 1 });
      if (!existing.length) await addCatalogItem("os", osValue, null);
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

    if (existing.length) {
      setToast({ show: true, message: `${type.toUpperCase()} already exists in catalog.`, type: "success" });
      return true;
    }

    await addCatalogItem(type, cleanValue, parent);
    setToast({ show: true, message: `${type.toUpperCase()} added to catalog.`, type: "success" });
    return true;
  };

  const handleMakePlus = async () => {
    const value = makeManual ? form.make : makeInput;
    if (!String(value || "").trim()) {
      setMakeManual((prev) => !prev);
      return;
    }

    try {
      await upsertCatalogValue("make", value, null);
    } catch (e) {
      setError(e?.message || "Failed to save make to catalog.");
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
      await upsertCatalogValue("model", value, parentMake);
    } catch (e) {
      setError(e?.message || "Failed to save model to catalog.");
    }
  };

  const handleOsPlus = async () => {
    const value = osManual ? form.os : osInput;
    if (!String(value || "").trim()) {
      setOsManual((prev) => !prev);
      return;
    }

    try {
      await upsertCatalogValue("os", value, null);
    } catch (e) {
      setError(e?.message || "Failed to save operating system to catalog.");
    }
  };

  const resetForNextAsset = () => {
    const preservedOrgId = String(form.orgId || passedOrgId || "").trim();
    const preservedCategory = String(form.category || passedCategory || "").trim();

    setForm({
      ...initialForm,
      orgId: preservedOrgId,
      category: "computer",
    });

    setMakeManual(false);
    setModelManual(false);
    setOsManual(false);
    setMakeInput("");
    setModelInput("");
    setOsInput("");
    setOwnerInput("");
    setPreviousOwnerInput("");
    setMakeSuggestions([]);
    setModelSuggestions([]);
    setOsSuggestions([]);
    setOwnerSuggestions([]);
    setPreviousOwnerSuggestions([]);
    setOsData(null);
    setPurchaseAmountInput("");
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const organizationId = String(form.orgId || passedOrgId || "").trim();
      if (!organizationId) throw new Error("Compliance: Select an organization before committing the asset.");
      if (!form.serialNumber || !form.make) throw new Error("Compliance: Serial Number and Make are mandatory.");

      await persistManualCatalogEntries();

      const normalizedPurchaseAmount = parseCurrencyValue(purchaseAmountInput || form.purchaseAmount);
      const costZAR = normalizedPurchaseAmount === ""
        ? null
        : Number(normalizedPurchaseAmount);

      const depreciationPeriod = 3;

      const payload = {
        ...form,
        orgId: organizationId,
        organizationId,
        category: "computer",

        assetTag: String(form.assetTag || "").trim(),
        qrLabel: String(form.qrLabel || form.assetTag || form.serialNumber || "").trim(),

        make: String(form.make || "").trim(),
        model: String(form.model || "").trim(),
        osVersion: String(form.osVersion || "").trim(),
        serialNumber: String(form.serialNumber || "").trim(),

        farNumber: String(form.farNumber || "").trim(),
        datePurchased: form.datePurchased ? new Date(form.datePurchased) : null,
        warrantyDate: form.warrantyDate ? new Date(form.warrantyDate) : null,
        costZAR,
        currentValue: Number.isFinite(liveCurrentValue) ? liveCurrentValue : 0,
        depreciationPeriod,
        vitalityStatus: String(form.status || "Live").trim(),
        physicalLocation: String(form.physicalLocation || "On Site").trim(),
        nextAction: String(form.nextAction || "").trim(),
        location: String(form.physicalLocation || "On Site").trim(),

        isStandardIssue: !modelManual && !!String(form.model || "").trim(),
      };

      payload.purchaseAmount = payload.costZAR;
      payload.status = payload.vitalityStatus;

      if (isCreate) {
        await createComputer(payload);
        setToast({ show: true, message: "Asset committed successfully.", type: "success" });
        resetForNextAsset();
        return;
      }

      await updateComputer(id, payload);
      setToast({ show: true, message: "Asset updated successfully.", type: "success" });
      navigate("/computers");
    } catch (e) {
      const message = e?.message?.includes("Conflict")
        ? "Audit Conflict: Duplicate Serial Detected"
        : (e?.message || "Failed to commit asset.");
      setError(message);
      setToast({ show: true, message, type: "error" });
    } finally { setSaving(false); }
  };

  // --- UI Styles ---
  const dropdownStyle = {
    position: "absolute", top: "100%", left: 0, width: "100%", background: "#1a1a1a",
    border: "1px solid #00d4ff", borderRadius: "8px", zIndex: 9999, listStyle: "none",
    padding: 0, boxShadow: "0 0 15px rgba(0, 212, 255, 0.4)", margin: "4px 0 0 0"
  };

  const supportPortal = getWarrantySite(form.make);
  const ownerWarningText = "Warning: Owner is unverified (Stored in AbandonedPep).";
  const canCommit = Boolean(String(form.orgId || passedOrgId || "").trim())
    && Boolean(String(form.serialNumber || "").trim())
    && Boolean(String(form.make || "").trim());

  const sidebarContent = (
    <div className="sideBlocks">
      <div className="sideBlock sideBlock--vitality">
        <div className="summary">
          <div className="summaryRow">
            <div className="summaryLabel summaryLabel--emphasis">Organization</div>
            <div className="summaryValue">{form.company || computer?.orgName || form.orgName || organisationFriendlyName || "-"}</div>
          </div>
          <div className="summaryRow">
            <div className="summaryLabel summaryLabel--emphasis">Lifecycle</div>
            <div className="summaryValue">
              <span className="summaryValueText summaryValueText--regular">{form.status || "-"}</span>
            </div>
          </div>
          <div className="summaryRow">
            <div className="summaryLabel summaryLabel--emphasis">Age</div>
            <div className="summaryValue">
              <span className="summaryValueText summaryValueText--regular">{assetAgeLabel}</span>
            </div>
          </div>
          <div className="summaryRow" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="summaryLabel summaryLabel--emphasis" title="Depreciation period: 3 Years">Current Value</div>
            <div className="summaryValue" style={{ textAlign: "right" }}>
              <span className="summaryValueText summaryValueText--regular" title="Depreciation period: 3 Years">{currentValueLabel}</span>
            </div>
          </div>
          {showOwnerAuditWarning && (
            <div className="summaryRow summaryRow--warning">
              <div className="summaryLabel summaryLabel--emphasis">Warning</div>
              <div className="summaryValue">
                <span className="warningTooltipWrap" aria-label={ownerWarningText}>
                  <FiAlertTriangle className="warningIcon" aria-hidden="true" />
                  <span className="warningTooltipText" role="tooltip">{ownerWarningText}</span>
                </span>
              </div>
            </div>
          )}
          {osData && (
            <div className="summaryRow">
              <div className="summaryLabel">Risk EOL</div>
              <div className="summaryValue" style={{ color: '#ff4d4f' }}>{osData.eol}</div>
            </div>
          )}

          <div className="summaryRow summaryRow--support">
            <div className="summaryLabel summaryLabel--emphasis">Support Portal</div>
            <div className="summaryValue">
              {supportPortal ? (
                <a className="warrantyLink warrantyLink--inline" href={supportPortal.url} target="_blank" rel="noreferrer">
                  <FiGlobe /> {form.make} Authority Site
                </a>
              ) : (
                <div className="sideBlock__text">No external portal linked for this make.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sideBlock sideBlock--compliance-qr">
        <div className="sideBlock__title">Compliance QR</div>
        <div className="qrWrapper qrWrapper--tight" style={{ background: '#fff', borderRadius: '12px' }}>
          {AssetQRCode({
            deviceName: form.computerName,
            farReg: form.farNumber,
            serialNumber: form.serialNumber,
            owner: ownerInput,
            organization: form.company || computer?.orgName || form.orgName || organisationFriendlyName,
            size: 90,
          }) || (
            <div style={{ background: '#eee', width: '100%', maxWidth: '220px', aspectRatio: '1/1', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiServer size={40} color="#ccc" />
            </div>
          )}
          <button className="btn-electric btnGhost" style={{ fontSize: '12px', whiteSpace: 'nowrap' }} onClick={() => window.print()}>
            <span><FiPrinter /> Print Label</span>
          </button>
        </div>
      </div>

      <div className="actionBlock" style={{ marginTop: 'auto' }}>
        <div className="actionBlock__buttons">
          <button
            className="btn-electric btnPrimary"
            onClick={handleSave}
            disabled={saving || !canCommit}
            title={!canCommit ? "Select organization, then provide Serial Number and Make." : ""}
          >
            <span>{saving ? "Updating Registry..." : "Commit Asset"}</span>
          </button>
          <button className="btn-electric btnPrimary" style={{ background: '#333' }} onClick={() => navigate("/computers")}><span>Discard Changes</span></button>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="system-loader">Initialising Managed Environment...</div>;

  return (
    <DetailsLayout
      title={isCreate ? "Workforce Dashboard" : `Edit: ${form.computerName}`}
      subtitle={isCreate ? "New Hardware Entry" : ""}
      sidebarContent={sidebarContent}
      compactSidebar
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

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 4 }}>

      {/* SECTION 1: HARDWARE Identification */}
      <div className="panel__title"><FiMonitor /> Hardware Identification</div>
      <div className="fieldGrid">
        <div className="field">
          <Zbot_Fields
            label="Device Name"
            value={form.computerName}
            onChange={e => setForm({...form, computerName: e.target.value})}
            placeholder="e.g. FIN-LAPTOP-01"
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Serial Number"
            value={form.serialNumber}
            onChange={e => setForm({...form, serialNumber: e.target.value})}
            placeholder="Required for Audit"
            className="value"
          />
        </div>

        <div className="field">
          <div className="label">Make (Authority)</div>
          <div className="zbot-field-row-align" style={{ position: "relative" }}>
            {!makeManual ? (
              <div style={{ flex: 1, position: 'relative' }}>
                <Zbot_Fields
                  value={makeInput}
                  onChange={e => { setMakeInput(e.target.value); setForm({...form, make: e.target.value, model: ""}); setModelInput(""); setModelSuggestions([]); fetchBrandData(e.target.value); }}
                  placeholder="Search Brands (Dell, HP)..."
                  className="value"
                />
                {makeSuggestions.length > 0 && (
                  <ul style={dropdownStyle}>
                    {makeSuggestions.map(s => (
                      <li key={s.id} style={{ padding: '12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #222' }} 
                          onMouseEnter={e => e.currentTarget.style.background = "#a259ec"} 
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                          onClick={() => { setForm({...form, make: s.label, model: ""}); setMakeInput(s.label); setModelInput(""); setModelSuggestions([]); setMakeSuggestions([]); }}>
                        {s.label} <FiCheckCircle size={12} style={{ marginLeft: 8, color: '#00d4ff' }} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : <Zbot_Fields value={form.make} onChange={e => setForm({...form, make: e.target.value})} placeholder="Manual entry..." className="value" />}
            <button type="button" className="btn-electric btnPrimary" style={{ borderRadius: '50%', width: 35, height: 35, padding: 0 }} onClick={handleMakePlus}><span><FiPlus /></span></button>
          </div>
        </div>

        <div className="field">
          <div className="label">Model (EOL Authority)</div>
          <div className="zbot-field-row-align" style={{ position: "relative" }}>
            {!modelManual ? (
              <div style={{ flex: 1, position: 'relative' }}>
                <Zbot_Fields
                  value={modelInput}
                  onChange={e => { setModelInput(e.target.value); setForm({...form, model: e.target.value}); fetchModelData(e.target.value, form.make); }}
                  placeholder="Search Model (XPS, Latitude)..."
                  className="value"
                  disabled={!form.make}
                />
                {modelSuggestions.length > 0 && (
                  <ul style={dropdownStyle}>
                    {modelSuggestions.map((s) => (
                      <li key={s.id} style={{ padding: '12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #222' }}
                          onMouseEnter={e => e.currentTarget.style.background = "#a259ec"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}
                          onClick={() => { 
                            setForm({...form, model: s.label}); 
                            setModelInput(s.label); 
                            setOsData({ eol: s.eol });
                            setModelSuggestions([]); 
                          }}>
                        {s.label} {s.eol && <span style={{ fontSize: 10, color: '#aaa', float: 'right' }}>EOL: {s.eol}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : <Zbot_Fields value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Manual entry..." className="value" />}
            <button type="button" className="btn-electric btnPrimary" style={{ borderRadius: '50%', width: 35, height: 35, padding: 0 }} onClick={handleModelPlus}><span><FiPlus /></span></button>
          </div>
        </div>
        
        <div className="field">
          <div className="label">Operating System</div>
          <div className="zbot-field-row-align" style={{ position: "relative" }}>
             {!osManual ? (
               <div style={{ flex: 1, position: 'relative' }}>
                  <Zbot_Fields
                    value={osInput}
                    onFocus={() => fetchOSData("")}
                    onChange={e => { setOsInput(e.target.value); setForm({...form, os: e.target.value}); fetchOSData(e.target.value); }}
                    placeholder="e.g. Windows 11 25H2"
                    className="value"
                  />
                  {osSuggestions.length > 0 && (
                    <ul style={dropdownStyle}>
                      {osSuggestions.map(s => (
                        <li key={s.id} style={{ padding: '12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #222' }}
                            onMouseEnter={e => e.currentTarget.style.background = "#a259ec"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                            onClick={() => { 
                              setForm({...form, os: s.label}); 
                              setOsInput(s.label);
                              setOsData({ eol: s.eol });
                              setOsSuggestions([]); 
                            }}>
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}
               </div>
             ) : <Zbot_Fields value={form.os} onChange={e => setForm({...form, os: e.target.value})} placeholder="Manual entry..." className="value" />}
             <button type="button" className="btn-electric btnPrimary" style={{ borderRadius: '50%', width: 35, height: 35, padding: 0 }} onClick={handleOsPlus}><span><FiPlus /></span></button>
          </div>
        </div>
      </div>

      {/* SECTION 2: GOVERNANCE & OWNERSHIP */}
      <div className="panel__title" style={{ marginTop: 40 }}><FiShield /> Governance & Ownership</div>
      <div className="fieldGrid">
        <div className="field">
          <Zbot_Fields
            label="Owner"
            value={ownerInput}
            onFocus={() => filterOwnerSuggestions("")}
            onChange={e => {
              setOwnerInput(e.target.value);
              setForm({ ...form, owner: e.target.value });
              filterOwnerSuggestions(e.target.value);
            }}
            placeholder="Search by name or email..."
            className="value"
          />
          {ownerSuggestions.length > 0 && (
            <ul style={dropdownStyle}>
              <li
                key="it-asset-owner"
                style={{ padding: '12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #222' }}
                onMouseEnter={e => e.currentTarget.style.background = "#a259ec"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
                onClick={() => {
                  setForm({ ...form, owner: "IT Asset Owner" });
                  setOwnerInput("IT Asset Owner");
                  setOwnerSuggestions([]);
                }}
              >
                IT Asset Owner
              </li>
              {ownerSuggestions.map(p => (
                <li key={getPersonId(p) || p.email} 
                    style={{ padding: '12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #222' }}
                    onMouseEnter={e => e.currentTarget.style.background = "#a259ec"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                    onClick={() => {
                      const ownerValue = String(p?.source || "") === "abandonedPep"
                        ? getOwnerDirectoryLabel(p)
                        : getPersonId(p);
                      setForm({ ...form, owner: ownerValue });
                      setOwnerInput(getOwnerDirectoryLabel(p));
                      setOwnerSuggestions([]);
                    }}>
                  {getOwnerDirectoryLabel(p)} {p.email && <span style={{ fontSize: 11, color: '#fff' }}>({p.email})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="field">
          <Zbot_Fields
            label="Previous Owner"
            value={previousOwnerInput}
            onChange={e => {
              setPreviousOwnerInput(e.target.value);
              filterPreviousOwnerSuggestions(e.target.value);
            }}
            placeholder="Search by name or email..."
            className="value"
          />
          {previousOwnerSuggestions.length > 0 && (
            <ul style={dropdownStyle}>
              {previousOwnerSuggestions.map(p => (
                <li key={getPersonId(p) || p.email}
                    style={{ padding: '12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #222' }}
                    onMouseEnter={e => e.currentTarget.style.background = "#a259ec"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                    onClick={() => {
                      setForm({ ...form, previousOwner: getPersonId(p) });
                      setPreviousOwnerInput(getPersonLabel(p));
                      setPreviousOwnerSuggestions([]);
                    }}>
                  {getPersonLabel(p)} {p.email && <span style={{ fontSize: 11, color: '#fff' }}>({p.email})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="field">
          <Zbot_Fields
            label="FAR Registration #"
            value={form.farNumber}
            onChange={e => setForm({...form, farNumber: e.target.value})}
            placeholder="Fixed Asset ID"
            className="value"
          />
        </div>
        <div className="field">
          <div className="label">Current Status</div>
          <select className="value" value={form.status || "Live"} onChange={e => setForm({ ...form, status: e.target.value })}>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="field">
          <div className="label">Next Action</div>
          <select className="value" value={form.nextAction || ""} onChange={e => setForm({ ...form, nextAction: e.target.value })}>
            <option value="">Select next action</option>
            {NEXT_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>

      {/* SECTION 3: FINANCIALS & Warranty */}
      <div className="panel__title" style={{ marginTop: 40 }}><FiCpu /> Financial Metadata</div>
      <div className="fieldGrid">
        <div className="field">
          <Zbot_Fields
            label="Purchase Date"
            type="date"
            value={form.datePurchased}
            onChange={e => setForm({...form, datePurchased: e.target.value})}
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Warranty Date"
            type="date"
            value={form.warrantyDate}
            onChange={e => setForm({...form, warrantyDate: e.target.value})}
            className="value"
          />
        </div>
        <div className="field">
          <Zbot_Fields
            label="Cost (ZAR)"
            placeholder="e.g. 22333.80"
            variant="financial"
            value={purchaseAmountInput}
            onChange={e => setPurchaseAmountInput(e.target.value)}
          />
        </div>
        <div className="field">
          <div className="label">Physical Location</div>
          <select className="value" value={form.physicalLocation || "On Site"} onChange={e => setForm({ ...form, physicalLocation: e.target.value })}>
            {PHYSICAL_LOCATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="audit-alert" style={{ background: 'rgba(255, 77, 79, 0.1)', border: '1px solid #ff4d4f', padding: '15px', borderRadius: '8px', marginTop: '30px', display: 'flex', gap: '10px', alignItems: 'center', color: '#ff4d4f', fontWeight: 'bold' }}>
          <FiAlertTriangle /> {error}
        </div>
      )}

      </div>
    </DetailsLayout>
  );
}