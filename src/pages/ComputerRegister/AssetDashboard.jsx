import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import Papa from "papaparse";
import DetailsLayout from "../DetailsLayout";
import "../../Styles/PeopleDashboard.css";
// Added specific icons for the modal
import { FiClipboard, FiMonitor, FiServer, FiCpu, FiVideo, FiAlertTriangle, FiBriefcase, FiTrendingUp } from "react-icons/fi";
import { Plus, Pencil, UploadCloud, CloudDownload } from "lucide-react";
import OrganizationSelector from "../../components/OrganizationSelector";
import { icons } from "./AssetDashboard.icons";
import { listComputers } from '../../data/Computer/Computer.repository.js';
import { listServers } from '../../data/Server/Server.repository.js';
import { listNetworkHardware } from '../../data/NetworkHardware/NetworkHardware.repository.js';
import { listAvequipment } from '../../data/Avequipment/Avequipment.repository.js';
import { useDashboardFilter } from "../../context/DashboardFilterContext";

export default function AssetDashboard() {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [computers, setComputers] = useState([]);
  const [servers, setServers] = useState([]);
  const [networkHardware, setNetworkHardware] = useState([]);
  const [avEquipment, setAvEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [importSummary, setImportSummary] = useState({
    open: false,
    successCount: 0,
    failedRows: [],
    totalRows: 0,
  });
  const [importToast, setImportToast] = useState({ show: false, type: "success", message: "" });
  const importInputRef = useRef(null);
  const navigate = useNavigate();
  const { activeDashboardFilter, setActiveDashboardFilter } = useDashboardFilter();

  const API_BASE =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

  const STATUS_OPTIONS = ["Live", "Retired", "Broken", "Stolen", "Lost", "Spare", "To Be Disposed"];
  const PHYSICAL_LOCATION_OPTIONS = ["On Site", "In Storage", "At Repairs", "Remote"];

  const activeOrgId = selectedOrgId;

  const toNumberValue = useCallback((value) => {
    if (value === undefined || value === null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    const raw = String(value).trim();
    if (!raw) return 0;

    const cleaned = raw.replace(/[^0-9,.-]/g, "");
    if (!cleaned) return 0;

    // Handle common formats:
    // 1) 28000.50
    // 2) 28,000.50
    // 3) 28 000,50 (after cleanup -> 28000,50)
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");

    let normalized = cleaned;
    if (hasComma && !hasDot) {
      normalized = cleaned.replace(/,/g, ".");
    } else if (hasComma && hasDot) {
      normalized = cleaned.replace(/,/g, "");
    }

    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  // --- Modal Logic ---
  const handleModalOpen = () => { if (selectedOrgId) setIsModalOpen(true); };
  const handleModalClose = () => setIsModalOpen(false);

  const handleImportClick = () => {
    if (isImporting) return;
    importInputRef.current?.click();
  };

  const handleBackToRegister = () => {
    navigate("/computers", {
      state: selectedOrgId ? { orgId: selectedOrgId, initialCategory: "computer" } : undefined,
    });
  };

  const closeImportSummary = () => {
    setImportSummary({ open: false, successCount: 0, failedRows: [], totalRows: 0 });
  };

  const parseCsvFile = (file) => new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated. Please log in.");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const detectBulkEndpoint = (headers = []) => {
    const normalized = headers.map((header) => String(header || "").trim().toLowerCase());
    if (normalized.includes("computername")) return `${API_BASE}/api/computers/bulk`;
    if (normalized.includes("servername")) return `${API_BASE}/api/servers/bulk`;
    if (normalized.includes("devicename")) return `${API_BASE}/api/network/bulk`;
    if (normalized.includes("equipmenttype")) return `${API_BASE}/api/av/bulk`;
    return "";
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedOrgId) {
      setImportToast({ show: true, type: "error", message: "Select an organization before importing." });
      event.target.value = "";
      return;
    }

    setIsImporting(true);
    try {
      const parsed = await parseCsvFile(file);
      const rows = Array.isArray(parsed?.data) ? parsed.data : [];
      const headers = Array.isArray(parsed?.meta?.fields) ? parsed.meta.fields : Object.keys(rows[0] || {});
      const endpoint = detectBulkEndpoint(headers);

      if (!endpoint) {
        throw new Error("Unable to detect template category from CSV headers.");
      }

      const validationErrors = [];
      const preparedRows = rows.map((row, idx) => {
        const rowNumber = idx + 1;
        const status = String(row?.status || "").trim();
        const physicalLocation = String(row?.physicalLocation || "").trim();

        if (!STATUS_OPTIONS.includes(status)) {
          validationErrors.push({ row: rowNumber, error: `Invalid status '${status || "(empty)"}'` });
        }

        if (!PHYSICAL_LOCATION_OPTIONS.includes(physicalLocation)) {
          validationErrors.push({ row: rowNumber, error: `Invalid physicalLocation '${physicalLocation || "(empty)"}'` });
        }

        return {
          ...row,
          orgId: selectedOrgId,
          organizationId: selectedOrgId,
        };
      });

      if (validationErrors.length) {
        setImportSummary({
          open: true,
          successCount: 0,
          failedRows: validationErrors,
          totalRows: rows.length,
        });
        setImportToast({ show: true, type: "error", message: "Import blocked by validation errors." });
        return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ rows: preparedRows }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.message || "Bulk import failed");
      }

      const summary = await response.json();
      const successCount = Number(summary?.successCount || 0);
      const failedRows = Array.isArray(summary?.failedRows) ? summary.failedRows : [];

      setImportToast({ show: true, type: "success", message: `Successfully imported ${successCount} assets.` });
      await fetchDashboardData();
      setRefreshTrigger((prev) => prev + 1);

      if (failedRows.length) {
        setImportSummary({
          open: true,
          successCount,
          failedRows,
          totalRows: preparedRows.length,
        });
      }

      if (successCount > 0) {
        event.target.value = "";
      }
    } catch (error) {
      setImportToast({ show: true, type: "error", message: error?.message || "Import failed due to a system error." });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAssetTypeSelect = (type) => {
    const routeMap = { computer: '/computers/new', server: '/servers/new', networking: '/networking/new', av: '/av-equipment/new' };
    setIsModalOpen(false);
    if (routeMap[type]) navigate(routeMap[type], { state: { orgId: selectedOrgId } });
  };

  const buildCsvFromHeaders = (headers) => `${headers.join(",")}\n`;

  const handleDownloadTemplates = async () => {
    const templates = [
      {
        fileName: "1_PCs_Template.csv",
        headers: ["computerName", "make", "model", "serialNumber", "farNumber", "datePurchased", "status", "owner", "os", "physicalLocation", "costZAR"],
      },
      {
        fileName: "2_Servers_Template.csv",
        headers: ["serverName", "make", "model", "serialNumber", "farNumber", "datePurchased", "status", "owner", "physicalLocation", "costZAR"],
      },
      {
        fileName: "3_Network_Template.csv",
        headers: ["deviceName", "make", "model", "serialNumber", "farNumber", "datePurchased", "status", "physicalLocation", "costZAR"],
      },
      {
        fileName: "4_AV_Template.csv",
        headers: ["equipmentType", "make", "model", "serialNumber", "farNumber", "datePurchased", "status", "physicalLocation", "costZAR"],
      },
    ];

    const readme = [
      "ASSET REGISTER IMPORT INSTRUCTIONS",
      "",
      "Header Mapping:",
      "PC: computerName, make, model, serialNumber, farNumber, datePurchased, status, owner, os, physicalLocation, costZAR",
      "Server: serverName, make, model, serialNumber, farNumber, datePurchased, status, owner, physicalLocation, costZAR",
      "Network: deviceName, make, model, serialNumber, farNumber, datePurchased, status, physicalLocation, costZAR",
      "AV: equipmentType, make, model, serialNumber, farNumber, datePurchased, status, physicalLocation, costZAR",
      "",
      "Status Constraints (Strict):",
      "status must be one of: Live, Retired, Broken, Stolen, Lost, Spare, To Be Disposed",
      "",
      "Location Constraints (Strict):",
      "physicalLocation must be one of: On Site, In Storage, At Repairs, Remote",
      "",
      "Format Requirements:",
      "datePurchased must be in YYYY-MM-DD format",
      "costZAR must be a plain numeric value (no currency symbols)",
      "",
      "Use these templates as the source of truth for bulk imports.",
    ].join("\n");

    const zip = new JSZip();
    templates.forEach((template) => {
      zip.file(template.fileName, buildCsvFromHeaders(template.headers));
    });
    zip.file("IMPORT_INSTRUCTIONS.txt", readme);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Asset_Register_Templates.zip");
    link.style.display = "none";
    document.body.appendChild(link);
    console.log("Template zip download starting...");
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!importToast.show) return;
    const timer = setTimeout(() => {
      setImportToast((prev) => ({ ...prev, show: false }));
    }, 2600);
    return () => clearTimeout(timer);
  }, [importToast.show]);

  // --- Navigation ---
  const handleOrgClick = () => { if (activeOrgId) navigate(`/computers`); };
  const handlePplClick = () => { if (activeOrgId) navigate(`/computers`, { state: { initialTab: "people" } }); };

  const fetchDashboardData = useCallback(async () => {
    if (!activeOrgId) {
      setComputers([]); setServers([]); setNetworkHardware([]); setAvEquipment([]);
      return;
    }

    setLoading(true);
    const params = { organizationId: activeOrgId, orgId: activeOrgId, page: 1, limit: 5000 };

    try {
      const [compRes, servRes, netRes, avRes] = await Promise.all([
      listComputers(params),
      listServers(params),
      listNetworkHardware(params),
      listAvequipment(params)
      ]);

      setComputers(compRes?.rows || (Array.isArray(compRes) ? compRes : []));
      setServers(servRes?.rows || (Array.isArray(servRes) ? servRes : []));
      setNetworkHardware(netRes?.rows || (Array.isArray(netRes) ? netRes : []));
      setAvEquipment(avRes?.rows || (Array.isArray(avRes) ? avRes : []));
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  // --- Scoped Fetching ---
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);

  // --- Data Processing ---
  const normalizeId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
      if (value._id) return normalizeId(value._id);
      if (value.id) return normalizeId(value.id);
      if (value.$oid) return normalizeId(value.$oid);
      if (typeof value.toString === "function") return value.toString().trim();
    }
    return String(value).trim();
  };

  const isAssetInSelectedOrg = (asset) => {
    const selected = normalizeId(selectedOrgId);
    if (!selected) return false;
    const orgA = normalizeId(asset?.organizationId);
    const orgB = normalizeId(asset?.orgId);
    return orgA === selected || orgB === selected;
  };

  const getAssetCategory = (asset) => {
    const explicit = String(asset?.category || "").toLowerCase().trim();
    if (["computer", "server", "networking", "av"].includes(explicit)) return explicit;
    if (asset?.computerName) return "computer";
    if (asset?.serverName || asset?.hostname) return "server";
    if (asset?.deviceName) return "networking";
    if (asset?.equipmentType) return "av";
    return "computer";
  };

  const getAssetName = (asset) => {
    return asset?.computerName || asset?.serverName || asset?.hostname || asset?.deviceName || asset?.equipmentType || "-";
  };

  const getAssetStatus = (asset) => String(asset?.status || asset?.systemStatus || asset?.currentStatus || "").trim();
  const getAssetLocation = (asset) => String(asset?.physicalLocation || asset?.location || "").trim();

  const getPurchaseDate = (asset) => {
    const raw = asset?.datePurchased || asset?.purchaseDate || asset?.dateOfPurchase;
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isHighRiskByAge = (asset) => {
    const purchaseDate = getPurchaseDate(asset);
    if (!purchaseDate) return false;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - 5);
    return purchaseDate < threshold;
  };

  const pcList = useMemo(() => (Array.isArray(computers) ? computers : []).filter(isAssetInSelectedOrg), [computers, selectedOrgId]);
  const serverList = useMemo(() => (Array.isArray(servers) ? servers : []).filter(isAssetInSelectedOrg), [servers, selectedOrgId]);
  const networkList = useMemo(() => (Array.isArray(networkHardware) ? networkHardware : []).filter(isAssetInSelectedOrg), [networkHardware, selectedOrgId]);
  const avList = useMemo(() => (Array.isArray(avEquipment) ? avEquipment : []).filter(isAssetInSelectedOrg), [avEquipment, selectedOrgId]);

  const categoryStats = useMemo(() => {
    const now = new Date();

    const isLiveStatus = (asset) => {
      const status = String(asset?.status || asset?.systemStatus || "").toLowerCase().trim();
      return status === "live" || status === "active" || status === "in use";
    };

    const getWarrantyDate = (asset) => {
      const raw = asset?.warrantyDate || asset?.dateWarrantyExpires || asset?.warrantyExpiry || asset?.warranty;
      if (!raw) return null;
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    
    const getMetrics = (list) => {
      const activeCount = list.filter(isLiveStatus).length;
      
      const eolCount = list.filter(a => {
        const warrantyDate = getWarrantyDate(a);
        if (!warrantyDate) return false;
        return warrantyDate <= now;
      }).length;

      const expiredWarrantyLiveCount = list.filter((a) => {
        const status = String(a?.status || a?.currentStatus || a?.systemStatus || "").toLowerCase().trim();
        if (status !== "live") return false;
        const warrantyDate = getWarrantyDate(a);
        if (!warrantyDate) return false;
        return warrantyDate < now;
      }).length;

      const totalValue = list.reduce((sum, a) => sum + toNumberValue(a?.costZAR ?? a?.purchaseAmount), 0);
      const totalCurrentValue = list.reduce((sum, a) => sum + toNumberValue(a?.currentValue), 0);

      return { total: list.length, active: activeCount, warranty: expiredWarrantyLiveCount, eol: eolCount, value: totalValue, currentValue: totalCurrentValue };
    };

    return {
      pc: getMetrics(pcList),
      server: getMetrics(serverList),
      network: getMetrics(networkList),
      av: getMetrics(avList)
    };
  }, [pcList, serverList, networkList, avList, toNumberValue]);

  const unifiedAssets = useMemo(() => [...pcList, ...serverList, ...networkList, ...avList], [pcList, serverList, networkList, avList]);
  
  const statusSummary = useMemo(() => {
    const byStatus = (value) => unifiedAssets.filter((a) => getAssetStatus(a).toLowerCase() === value).length;
    const byLocationContains = (value) => unifiedAssets.filter((a) => getAssetLocation(a).toLowerCase().includes(value)).length;
    const live = unifiedAssets.filter((a) => {
      const status = getAssetStatus(a).toLowerCase();
      return status === "live" || status === "active" || status === "in use";
    }).length;
    return {
      live,
      storage: byLocationContains("store"),
      repair: byLocationContains("repair"),
      retired: byStatus("retired"),
      broken: byStatus("broken"),
      stolen: byStatus("stolen"),
      lost: byStatus("lost"),
      stolenLost: byStatus("stolen") + byStatus("lost"),
      grandTotal: unifiedAssets.reduce((sum, a) => sum + toNumberValue(a?.costZAR ?? a?.purchaseAmount), 0)
    };
  }, [unifiedAssets, toNumberValue]);

  const nextActionSummary = useMemo(() => {
    const getAction = (asset) => String(asset?.nextAction || "").trim().toLowerCase();
    const actions = ["replace", "reassign", "monitor", "dispose"];

    const counts = actions.reduce((acc, action) => {
      acc[action] = 0;
      return acc;
    }, {});

    unifiedAssets.forEach((asset) => {
      const action = getAction(asset);
      if (counts[action] !== undefined) {
        counts[action] += 1;
      }
    });

    const rows = [
      { key: "replace", label: "Replace", count: counts.replace },
      { key: "reassign", label: "Reassign", count: counts.reassign },
      { key: "monitor", label: "Monitor", count: counts.monitor },
      { key: "dispose", label: "Dispose", count: counts.dispose },
    ];

    return {
      rows,
      total: rows.reduce((sum, row) => sum + row.count, 0),
    };
  }, [unifiedAssets]);

  const riskMetrics = useMemo(() => {
    const thresholdDate = new Date();
    thresholdDate.setFullYear(thresholdDate.getFullYear() - 5);

    const placeholderRegex = /(tbc|pending|12345|n\/?a|0000)/i;

    const isRetired = (asset) => String(asset?.status || "").toLowerCase().trim() === "retired";
    const isLive = (asset) => String(asset?.status || asset?.systemStatus || "").toLowerCase().trim() === "live";

    const isUnassignedOwner = (asset) => {
      const rawOwner = asset?.owner || asset?.assignedTo || "";
      if (rawOwner === null || rawOwner === undefined) return true;
      const owner = String(rawOwner).trim().toLowerCase();
      return owner === "" || owner === "unassigned";
    };

    const refreshRequired = unifiedAssets.filter((a) => {
      // 1. LOG EVERYTHING IMMEDIATELY
      console.log("RAW ASSET DATA:", a);

      // 2. Deep Lookup for Status
      const rawStatus = a.status || a.currentStatus || a.systemStatus || a.Status || "";
      const isLive = String(rawStatus).toLowerCase().trim() === "live";

      // 3. Deep Lookup for Date
      const rawDate = a.datePurchased || a.purchaseDate || a.dateOfPurchase;

      // 4. Threshold (2026 - 5 = 2021)
      const threshold = new Date();
      threshold.setFullYear(threshold.getFullYear() - 5);

      let isOld = false;
      if (rawDate) {
        const pDate = new Date(rawDate);
        isOld = !Number.isNaN(pDate.getTime()) && pDate < threshold;
      }

      if (isLive && isOld) {
        console.log(`MATCH FOUND [${a.computerName || a.serverName || a.deviceName || a.equipmentType || "Unknown"}]: Old: ${isOld}, Status: ${rawStatus}`);
      }

      return isLive && isOld;
    });

    const dataMissing = unifiedAssets.filter((asset) => {
      const essentialFields = [
        asset?.serialNumber,
        asset?.warrantyDate,
        asset?.status || asset?.currentStatus,
        asset?.owner,
        asset?.farNumber,
        asset?.nextAction,
        asset?.datePurchased || asset?.purchaseDate,
        asset?.costZAR || asset?.purchaseAmount,
        asset?.physicalLocation || asset?.location,
      ];
      return essentialFields.some((field) => !field || String(field).trim() === "");
    });
    const zombieAssets = unifiedAssets.filter((a) => {
      const rawStatus = String(a.status || a.currentStatus || "").toLowerCase().trim();
      const rawLocation = String(a.physicalLocation || a.location || "").toLowerCase().trim();
      const isZombie = rawStatus === "retired" && rawLocation !== "in storage";
      console.log(`ZOMBIE CHECK [${a.hostname || a.computerName || a.serverName || a.deviceName || a.equipmentType || "Unknown"}]: Status: ${rawStatus} | Location: ${rawLocation} | RESULT: ${isZombie}`);
      return isZombie;
    });
    const placeholderData = unifiedAssets.filter((asset) => {
      const serial = String(asset?.serialNumber || "");
      const far = String(asset?.farNumber || "");
      return isAssetInSelectedOrg(asset) && (placeholderRegex.test(serial) || placeholderRegex.test(far));
    });

    const riskMap = new Map();
    const includeRiskAsset = (asset) => {
      const id = asset?._id || asset?.id || `${asset?.serialNumber || ""}-${asset?.farNumber || ""}-${asset?.computerName || asset?.serverName || asset?.deviceName || asset?.equipmentType || ""}`;
      if (!id) return;
      riskMap.set(String(id), asset);
    };

    refreshRequired.forEach(includeRiskAsset);
    dataMissing.forEach(includeRiskAsset);
    zombieAssets.forEach(includeRiskAsset);
    placeholderData.forEach(includeRiskAsset);

    const riskValue = Array.from(riskMap.values()).reduce((sum, asset) => {
      const rawCost = asset?.costZAR || asset?.purchaseAmount || asset?.value || 0;
      return sum + toNumberValue(rawCost);
    }, 0);

    console.log("[RiskMetrics]", {
      orgId: selectedOrgId,
      refreshRequired: refreshRequired.length,
      dataMissing: dataMissing.length,
      zombieAssets: zombieAssets.length,
      placeholderData: placeholderData.length,
      uniqueRiskAssets: riskMap.size,
      riskValue,
    });

    return {
      riskCount: riskMap.size,
      riskValue,
      refreshRequiredCount: refreshRequired.length,
      dataMissingCount: dataMissing.length,
      zombieCount: zombieAssets.length,
      placeholderCount: placeholderData.length,
    };
  }, [unifiedAssets, selectedOrgId, toNumberValue]);

  const lifecycleForecast = useMemo(() => {
    const isAction = (asset, action) => String(asset?.nextAction || "").toLowerCase().trim() === String(action).toLowerCase();

    const replaceAssets = unifiedAssets.filter((asset) => isAction(asset, "Replace"));
    const reassignAssets = unifiedAssets.filter((asset) => isAction(asset, "Reassign"));
    const disposeAssets = unifiedAssets.filter((asset) => isAction(asset, "Dispose"));

    const replacementBudget = replaceAssets.reduce((sum, asset) => sum + toNumberValue(asset?.costZAR ?? asset?.purchaseAmount), 0);
    const reassignmentValue = reassignAssets.reduce((sum, asset) => sum + toNumberValue(asset?.costZAR ?? asset?.purchaseAmount), 0);
    const pendingDisposal = disposeAssets.length;
    const forecastTotal = replacementBudget + reassignmentValue;

    return {
      replacementBudget,
      reassignmentValue,
      pendingDisposal,
      forecastTotal,
    };
  }, [unifiedAssets, toNumberValue]);

  const yearlyRiskSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const countsByYear = new Map();

    unifiedAssets.forEach((asset) => {
      const purchaseDate = getPurchaseDate(asset);
      if (!purchaseDate) return;
      const year = purchaseDate.getFullYear();
      if (year < 1990 || year > currentYear) return;
      countsByYear.set(year, (countsByYear.get(year) || 0) + 1);
    });

    const years = Array.from(countsByYear.keys()).sort((a, b) => a - b);
    const startYear = years.length ? years[0] : currentYear;
    const endYear = currentYear;
    const bars = [];
    for (let y = startYear; y <= endYear; y += 1) bars.push({ year: y, count: countsByYear.get(y) || 0 });

    const maxCount = Math.max(1, ...bars.map((b) => b.count));
    const highRiskAssets = unifiedAssets.filter(isHighRiskByAge);
    const totalFleetValue = unifiedAssets.reduce((sum, asset) => sum + toNumberValue(asset?.costZAR ?? asset?.purchaseAmount), 0);
    const totalRiskValue = highRiskAssets.reduce((sum, asset) => sum + toNumberValue(asset?.costZAR ?? asset?.purchaseAmount), 0);

    return {
      bars,
      startYear,
      endYear,
      maxCount,
      totalFleetValue,
      totalRiskValue,
      highRiskCount: highRiskAssets.length,
    };
  }, [unifiedAssets, isHighRiskByAge, toNumberValue]);

  const formatZAR = (val) => Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);
  const Icon = (Ico, size = 28) => <Ico size={size} color="#00FFFF" />;

  const runDashboardAudit = useCallback(() => {
    if (!activeOrgId) return;

    const sourceTotalAssets = unifiedAssets.length;
    const calculatedFinancialTotal = unifiedAssets
      .reduce((sum, asset) => sum + toNumberValue(asset?.costZAR ?? asset?.purchaseAmount), 0);

    const statusCounts = unifiedAssets.reduce((acc, asset) => {
      const status = String(asset?.status || asset?.systemStatus || "").toLowerCase().trim();
      if (status === "live") acc.live += 1;
      if (status === "broken") acc.broken += 1;
      if (status === "retired") acc.retired += 1;
      if (status === "stolen") acc.stolen += 1;
      if (status === "lost") acc.lost += 1;
      return acc;
    }, { live: 0, broken: 0, retired: 0, stolen: 0, lost: 0 });

    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - 5);
    const calculatedRiskCount = unifiedAssets.filter((asset) => {
      const purchaseDate = getPurchaseDate(asset);
      if (!purchaseDate) return false;
      return purchaseDate < threshold;
    }).length;

    const uiSidebarCount = categoryStats.pc.total + categoryStats.server.total + categoryStats.network.total + categoryStats.av.total;
    const uiTileValue = statusSummary.grandTotal;
    const calculatedStolenLost = statusCounts.stolen + statusCounts.lost;
    const uiStolenLost = statusSummary.stolenLost;

    const nextActionTotal = nextActionSummary.total;
    const statusBreakdownLikelyAllCategories = sourceTotalAssets === (pcList.length + serverList.length + networkList.length + avList.length);
    const nextActionLikelyAllCategories = nextActionTotal <= sourceTotalAssets;

    console.groupCollapsed(`[AUDIT] Dashboard Data Audit (${activeOrgId})`);
    console.log(`[AUDIT] Total Assets: ${sourceTotalAssets} | UI Sidebar shows: ${uiSidebarCount}`);
    if (sourceTotalAssets !== uiSidebarCount) {
      console.warn("[AUDIT] DATA MISMATCH DETECTED: Total Assets");
    }

    console.log(`[AUDIT] Total Value: ${calculatedFinancialTotal} | UI Tile shows: ${uiTileValue}`);
    if (Math.abs(calculatedFinancialTotal - uiTileValue) > 0.001) {
      console.warn("[AUDIT] DATA MISMATCH DETECTED: Total Value");
    }

    console.log(`[AUDIT] Stolen/Lost Count: ${calculatedStolenLost} | UI Tile shows: ${uiStolenLost}`);
    if (calculatedStolenLost !== uiStolenLost) {
      console.warn("[AUDIT] DATA MISMATCH DETECTED: Stolen/Lost Count");
    }

    console.log(`[AUDIT] Risk Count (>5y): ${calculatedRiskCount} | UI Tile shows: ${riskMetrics.refreshRequiredCount}`);
    if (calculatedRiskCount !== riskMetrics.refreshRequiredCount) {
      console.warn("[AUDIT] DATA MISMATCH DETECTED: Risk Count");
    }

    console.log("[AUDIT] Unified Status Counts:", statusCounts);

    console.log(`[AUDIT] Category Leak Check (Status Breakdown): ${statusBreakdownLikelyAllCategories ? "PASS" : "FAIL"}`);
    if (!statusBreakdownLikelyAllCategories) {
      console.warn("[AUDIT] DATA MISMATCH DETECTED: Status Breakdown may not include all categories");
    }

    console.log(`[AUDIT] Next Action Summary Check: ${nextActionLikelyAllCategories ? "PASS" : "FAIL"} | Next Action Total: ${nextActionTotal} | Source Total: ${sourceTotalAssets}`);
    if (!nextActionLikelyAllCategories) {
      console.warn("[AUDIT] DATA MISMATCH DETECTED: Next Action Summary exceeds source asset total");
    }
    console.groupEnd();
  }, [
    activeOrgId,
    pcList,
    serverList,
    networkList,
    avList,
    unifiedAssets,
    categoryStats,
    statusSummary,
    riskMetrics,
    nextActionSummary,
    getPurchaseDate,
    toNumberValue,
  ]);

  const openDrillDown = useCallback((title, matcher, filterMeta = {}) => {
    const rows = unifiedAssets
      .filter((asset) => {
        try {
          return matcher(asset);
        } catch {
          return false;
        }
      })
      .map((asset) => ({
        id: normalizeId(asset?._id || asset?.id) || `${asset?.serialNumber || "no-serial"}-${getAssetName(asset)}`,
        category: getAssetCategory(asset),
        name: getAssetName(asset),
        serialNumber: String(asset?.serialNumber || "-"),
        make: String(asset?.make || "-"),
        model: String(asset?.model || "-"),
        status: getAssetStatus(asset) || "-",
        physicalLocation: getAssetLocation(asset) || "-",
      }));

    const filterPayload = {
      type: String(filterMeta?.type || "assetIds"),
      value: filterMeta?.value ?? "",
      label: filterMeta?.label || title,
      category: String(filterMeta?.category || "all"),
      assetIds: rows.map((r) => r.id),
      orgId: selectedOrgId,
      source: "assetDashboard",
      updatedAt: Date.now(),
    };

    setActiveDashboardFilter(filterPayload);
    navigate("/computers", {
      state: {
        orgId: selectedOrgId,
        category: filterPayload.category || "all",
        dashboardFilter: filterPayload,
      },
    });
  }, [navigate, selectedOrgId, setActiveDashboardFilter, unifiedAssets]);

  useEffect(() => {
    if (loading) return;
    runDashboardAudit();
  }, [loading, runDashboardAudit]);

  const categoryRouteMap = {
    pc: { path: "/computers", initialCategory: "computer" },
    server: { path: "/servers", initialCategory: "server" },
    network: { path: "/networking", initialCategory: "networking" },
    av: { path: "/av", initialCategory: "av" },
  };

  const financialRows = useMemo(() => {
    const rows = [
      {
        key: "pc",
        label: "PCs",
        original: categoryStats.pc.value,
        current: categoryStats.pc.currentValue,
        onClick: () => openDrillDown("Drill Down: PC Financial Value", (a) => getAssetCategory(a) === "computer"),
      },
      {
        key: "server",
        label: "Servers",
        original: categoryStats.server.value,
        current: categoryStats.server.currentValue,
        onClick: () => openDrillDown("Drill Down: Server Financial Value", (a) => getAssetCategory(a) === "server"),
      },
      {
        key: "network",
        label: "Network",
        original: categoryStats.network.value,
        current: categoryStats.network.currentValue,
        onClick: () => openDrillDown("Drill Down: Network Financial Value", (a) => getAssetCategory(a) === "networking"),
      },
      {
        key: "av",
        label: "Audio Visual",
        original: categoryStats.av.value,
        current: categoryStats.av.currentValue,
        onClick: () => openDrillDown("Drill Down: AV Financial Value", (a) => getAssetCategory(a) === "av"),
      },
    ];

    return rows;
  }, [categoryStats, openDrillDown]);

  const totalInvestmentValue = useMemo(
    () => categoryStats.pc.value + categoryStats.server.value + categoryStats.network.value + categoryStats.av.value,
    [categoryStats]
  );

  const totalCurrentFinancialValue = useMemo(
    () => categoryStats.pc.currentValue + categoryStats.server.currentValue + categoryStats.network.currentValue + categoryStats.av.currentValue,
    [categoryStats]
  );

  const isTileSelected = ({ types = [], values = [], labels = [] }) => {
    if (activeDashboardFilter?.source !== "assetDashboard") return false;
    const type = String(activeDashboardFilter?.type || "").toLowerCase();
    const value = String(activeDashboardFilter?.value || "").toLowerCase();
    const label = String(activeDashboardFilter?.label || "").toLowerCase();

    const typeMatch = types.map((t) => String(t).toLowerCase()).includes(type);
    const typeValueMatch = types.length > 0 && values.length > 0 && typeMatch && values.map((v) => String(v).toLowerCase()).includes(value);
    const typeOnlyMatch = types.length > 0 && values.length === 0 && typeMatch;

    const labelMatch = labels.map((l) => String(l).toLowerCase()).includes(label);
    return typeValueMatch || typeOnlyMatch || labelMatch;
  };

  const metricTileStyle = {
    width: "100%",
    minHeight: 300,
    height: 300,
    maxHeight: 300,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 4,
  };

  const breakdownListStyle = {
    width: "100%",
    marginTop: 8,
  };

  const summaryLineStyle = {
    fontSize: 18,
    fontWeight: 800,
    color: "#00b4ff",
    marginTop: 8,
  };

  const tileTitleStyle = {
    color: "#b3e0ff",
    fontWeight: 700,
    marginTop: -25,
  };

  const chartWidth = 310;
  const chartHeight = 90;
  const chartPadding = 8;
  const chartPlotWidth = chartWidth - chartPadding * 2;
  const chartPlotHeight = chartHeight - chartPadding * 2;

  const handleRowNavigate = (path, category, statusFilter, locationFilter, extraState = {}) => {
    if (!selectedOrgId || !path) return;
    navigate(path, {
      state: {
        orgId: selectedOrgId,
        category: category || "",
        initialFilterStatus: statusFilter || "",
        initialFilterLocation: locationFilter || "",
        initialCategory: category || "",
        ...extraState,
      },
    });
  };
  
  const breakdownRow = (label, value, isPercent = false, options = {}) => (
    <div
      className={`breakdownList-row${(options.path || options.onClick) ? " interactive-electric" : ""}`}
      onClick={() => {
        if (typeof options.onClick === "function") {
          options.onClick();
          return;
        }
        handleRowNavigate(
          options.path,
          options.initialCategory,
          options.initialFilterStatus,
          options.initialFilterLocation,
          options.extraState,
        );
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (typeof options.onClick === "function") {
            options.onClick();
          } else {
            handleRowNavigate(
              options.path,
              options.initialCategory,
              options.initialFilterStatus,
              options.initialFilterLocation,
              options.extraState,
            );
          }
        }
      }}
      role={(options.path || options.onClick) ? "button" : undefined}
      tabIndex={(options.path || options.onClick) ? 0 : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
        marginBottom: 4,
        "--spark-speed": `${(0.42 + Math.random() * 0.15).toFixed(2)}s`,
      }}
    >
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}:</span>
      <strong style={{ whiteSpace: "nowrap", color: options.valueColor || undefined }}>{isPercent ? `${value}%` : value}</strong>
    </div>
  );

  const sidebar = (
    <div className="sideBlocks dashboardSidebar">
      <div className="sideBlock">
        <OrganizationSelector selectedOrgId={selectedOrgId} setSelectedOrgId={setSelectedOrgId} onOrgChange={setSelectedOrgId} />
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888', textAlign: 'right', marginTop: 2, marginBottom: 18, letterSpacing: 0.5 }}></div>
        <div style={{ borderTop: '1px solid #ececf3', margin: '12px 0 16px 0' }} />
        <div className="sideBlock__title">ACTIONS</div>
        <div className="action-row" aria-label="Sidebar actions">
          <div className="action-flicker-square" onClick={handleBackToRegister} title="Back to Asset Register"><div className="flicker-icon-wrapper"><FiClipboard size={20} /></div></div>

          <div className="action-flicker-square" onClick={handleModalOpen} title="New Asset"><div className="flicker-icon-wrapper"><Plus size={22} /></div></div>

          <div className="action-flicker-square" title="Import Data"><input type="file" className="flicker-input-overlay" onChange={handleImportFileChange} accept=".csv" disabled={isImporting} /><div className="flicker-icon-wrapper"><UploadCloud size={22} /></div></div>

          <div className="action-flicker-square" onClick={handleDownloadTemplates} title="Export Templates"><div className="flicker-icon-wrapper"><CloudDownload size={22} /></div></div>
        </div>
      </div>
 
      <div className="sideBlock">
        <div className="sideBlock__title">Total Assets</div>
        <div className="breakdownList" style={breakdownListStyle}>
          {breakdownRow("PCs", categoryStats.pc.total, false, categoryRouteMap.pc)}
          {breakdownRow("Servers", categoryStats.server.total, false, categoryRouteMap.server)}
          {breakdownRow("Network", categoryStats.network.total, false, categoryRouteMap.network)}
          {breakdownRow("Audio Visual", categoryStats.av.total, false, categoryRouteMap.av)}
        </div>
        <div style={{ borderTop: "1px solid #ececf3", margin: "14px 0 12px 0" }} />
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#b3e0ff", marginBottom: 8 }}>
          Yearly Risk Summary
        </div>
        <div style={{ width: "100%" }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight - 16}`} width="100%" height="84" role="img" aria-label="Yearly risk summary chart">
            <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#0f1b33" rx="8" />
            {yearlyRiskSummary.bars.map((bar, idx) => {
              const barCount = yearlyRiskSummary.bars.length;
              const slot = chartPlotWidth / Math.max(1, barCount);
              const width = Math.max(4, slot - 2);
              const x = chartPadding + idx * slot + (slot - width) / 2;
              const height = (bar.count / yearlyRiskSummary.maxCount) * chartPlotHeight;
              const y = chartHeight - chartPadding - height;
              return (
                <rect key={`yr-bar-${bar.year}`} x={x} y={y} width={width} height={Math.max(2, height)} fill="#7a4dff" rx="2" />
              );
            })}
            <line x1={chartPadding} y1={chartHeight - 16 - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - 16 - chartPadding} stroke="#00d4ff" strokeOpacity="0.7" strokeWidth="1" />
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#eaf6ff", fontWeight: 700 }}>
            <span>{yearlyRiskSummary.startYear}</span>
            <span>{yearlyRiskSummary.endYear}</span>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#b3e0ff", fontSize: 12, fontWeight: 700 }}>
              <span>Total Fleet Value</span>
              <span style={{ color: "#00d4ff" }}>{formatZAR(yearlyRiskSummary.totalFleetValue)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#b3e0ff", fontSize: 12, fontWeight: 700 }}>
              <span>Total Risk Value</span>
              <span style={{ color: "#00d4ff" }}>{formatZAR(yearlyRiskSummary.totalRiskValue)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#b3e0ff", fontSize: 12, fontWeight: 700 }}>
              <span>High-Risk Count</span>
              <span style={{ color: "#00d4ff" }}>{yearlyRiskSummary.highRiskCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DetailsLayout title="Asset Management Dashboard" subtitle="Live asset and compliance metrics" sidebarContent={sidebar} renderHeaderInPanel={true} onOrgClick={handleOrgClick} onPplClick={handlePplClick} status="active">
      <style>{`
        .breakdownList-row.interactive-electric {
          cursor: pointer;
          position: relative;
          overflow: hidden;
          border-radius: 4px;
          padding: 1px 2px;
        }

        .breakdownList-row.interactive-electric span,
        .breakdownList-row.interactive-electric strong {
          transition: text-shadow 340ms ease, color 340ms ease;
        }

        .breakdownList-row.interactive-electric:hover span,
        .breakdownList-row.interactive-electric:hover strong,
        .breakdownList-row.interactive-electric:focus-visible span,
        .breakdownList-row.interactive-electric:focus-visible strong {
          text-shadow: 0 0 10px #00b4ff;
          color: #d8f6ff;
        }

        .breakdownList-row.interactive-electric::after {
          content: "";
          position: absolute;
          top: 0;
          left: -18%;
          width: 8px;
          height: 100%;
          background: #00e5ff;
          opacity: 0;
          transform: skewX(-20deg);
          box-shadow: 0 0 14px #00d9ff, 0 0 22px #00b4ff;
          pointer-events: none;
        }

        .breakdownList-row.interactive-electric:hover::after,
        .breakdownList-row.interactive-electric:focus-visible::after {
          opacity: 1;
          animation: electric-arc var(--spark-speed, 0.50s) ease-out 1;
        }

        @keyframes electric-arc {
          0% { left: -18%; opacity: 0; }
          20% { opacity: 1; }
          100% { left: 118%; opacity: 0; }
        }

        @keyframes spin-cyan {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes jello {
          11.1% { transform: none; }
          22.2% { transform: skewX(-12.5deg) skewY(-12.5deg); }
          33.3% { transform: skewX(6.25deg) skewY(6.25deg); }
          44.4% { transform: skewX(-3.125deg) skewY(-3.125deg); }
          55.5% { transform: skewX(1.5625deg) skewY(1.5625deg); }
          66.6% { transform: skewX(-0.78125deg) skewY(-0.78125deg); }
          77.7% { transform: skewX(0.390625deg) skewY(0.390625deg); }
          88.8% { transform: skewX(-0.1953125deg) skewY(-0.1953125deg); }
          100% { transform: none; }
        }

        .animate-jello {
          transform-origin: center;
          animation-name: jello;
          animation-duration: 0.9s;
          animation-fill-mode: both;
          animation-iteration-count: 1;
          will-change: transform;
        }

        .jello-delay-1 { animation-delay: 0s; }
        .jello-delay-2 { animation-delay: 0.07s; }
        .jello-delay-3 { animation-delay: 0.14s; }
        .jello-delay-4 { animation-delay: 0.21s; }
        .jello-delay-5 { animation-delay: 0.28s; }
        .jello-delay-6 { animation-delay: 0.35s; }

        @media (prefers-reduced-motion: reduce) {
          .animate-jello {
            animation: none !important;
          }
        }

        html, body, #root {
          height: 100% !important;
          overflow: hidden !important;
          margin: 0;
        }

        .dashboard-stage-root {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          height: 100vh !important;
          overflow-y: hidden !important;
          padding-bottom: 20px !important;
        }

        .appBody {
          overflow-y: hidden !important;
        }

        .tileGrid {
          display: grid !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          grid-template-columns: repeat(3, 1fr) !important;
          grid-template-rows: repeat(2, 300px) !important;
          gap: 24px !important;
          justify-content: stretch !important;
          justify-items: stretch !important;
          align-items: stretch !important;
        }

        .tileGrid > .tile.statCard {
          width: 100% !important;
          height: 300px !important;
          display: flex !important;
          flex: 1 1 auto !important;
          max-width: none !important;
          margin: 0 !important;
        }

        .tile-content-wrapper {
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .tile-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
        }

        .tile-watermark svg {
          color: #00FFFF;
          opacity: 0.12;
          filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.22));
        }

        .tile-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          width: 100%;
          text-align: left;
          position: relative;
          z-index: 2;
        }

        .tile-footer {
          margin-top: auto;
          width: 100%;
          text-align: left;
          position: relative;
          z-index: 2;
        }

        .tile-body .tile-title,
        .tile-body .breakdownList,
        .tile-body .breakdownList-row {
          width: 100%;
          text-align: left;
        }

        .dashboardSidebar .sideBlock::before,
        .dashboardSidebar .sideBlock::after {
          content: none !important;
          display: none !important;
          background-image: none !important;
        }

        .dashboardSidebar,
        .dashboardSidebar.sideBlocks {
          height: 100% !important;
          max-height: none !important;
          overflow: visible !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          gap: 30px !important;
          width: 100% !important;
          min-width: 0 !important;
        }

        .panel.panelSticky {
          padding-right: 0 !important;
        }

        .sideBlock {
          margin-bottom: 0 !important;
          flex-shrink: 0 !important;
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          margin-bottom: 10px;
          width: 100%;
          max-width: 100%;
        }
      `}</style>
      {importToast.show && (
        <div
          style={{
            position: "fixed",
            right: 24,
            top: 24,
            zIndex: 10050,
            background: importToast.type === "success" ? "#0b3d91" : "#842029",
            color: "#fff",
            border: importToast.type === "success" ? "1px solid #00d4ff" : "1px solid #ff7a7a",
            borderRadius: 10,
            padding: "10px 14px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
            fontWeight: 700,
          }}
        >
          {importToast.message}
        </div>
      )}

      {importSummary.open && (
        <div
          onClick={closeImportSummary}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8, 14, 28, 0.65)",
            zIndex: 10040,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 94vw)",
              maxHeight: "78vh",
              overflow: "hidden",
              borderRadius: 14,
              background: "linear-gradient(140deg, #101a30 0%, #13213f 100%)",
              border: "1px solid rgba(0, 212, 255, 0.35)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
              color: "#eaf6ff",
            }}
          >
            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(0, 212, 255, 0.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#00d4ff" }}>Import Summary</div>
              <button className="btn-electric btnPrimary" onClick={closeImportSummary} style={{ padding: "6px 12px" }}><span>Close</span></button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 18, fontWeight: 700, marginBottom: 12 }}>
                <span style={{ color: "#00d4ff" }}>Successful: {importSummary.successCount}</span>
                <span style={{ color: "#ff9aa2" }}>Failed: {importSummary.failedRows.length}</span>
                <span style={{ color: "#b3d7ff" }}>Total: {importSummary.totalRows}</span>
              </div>
              <div style={{ maxHeight: "48vh", overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 12, background: "rgba(7, 15, 34, 0.55)" }}>
                {importSummary.failedRows.length === 0 ? (
                  <div style={{ color: "#9be7ff", fontWeight: 700 }}>No row-level errors reported.</div>
                ) : (
                  importSummary.failedRows.map((item, idx) => (
                    <div key={`${item.row}-${idx}`} style={{ marginBottom: 8, color: "#ffd6d9" }}>
                      Row {item.row}: {item.error}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {!activeOrgId ? (
        <div style={{ color: "#fff", fontSize: 20, padding: 40 }}>Select an Organization to view metrics.</div>
      ) : loading ? (
        <div style={{ color: "#fff", fontSize: 22, padding: 40 }}>Initializing Analytics Engine...</div>
      ) : (
        <div className="dashboard-stage-root">
        <div className="tileGrid" style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", alignItems: "stretch", justifyItems: "stretch", justifyContent: "stretch", gap: 20, margin: 0, padding: 0 }}>
          {/* Tile 1: Compliance & Risk */}
          <div className={`tile statCard ${isTileSelected({
            types: ["compliance"],
            values: ["refreshRequired", "dataMissing", "zombieAssets", "placeholderData", "riskAssets"],
            labels: ["Risk Assets", "Refresh Required (5yr+)", "Data Missing", "Zombie Assets", "Placeholder Data"],
          }) ? "tile-selected" : ""}`} style={metricTileStyle}>
            <div className="tile-content-wrapper">
              <div className="tile-watermark">{Icon(icons.risk || FiAlertTriangle, 200)}</div>
              <div className="tile-body">
                <div className="tile-title" style={tileTitleStyle}>Compliance & Risk</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#00b4ff", lineHeight: 1.1 }}>Risk Count: {riskMetrics.riskCount}</div>
                <div className="breakdownList" style={breakdownListStyle}>
                  {breakdownRow("Refresh Required (5yr+)", riskMetrics.refreshRequiredCount, false, {
                    onClick: () => openDrillDown("Drill Down: Refresh Required (5yr+)", (asset) => {
                      const status = getAssetStatus(asset).toLowerCase();
                      return status === "live" && isHighRiskByAge(asset);
                    }, { type: "compliance", value: "refreshRequired", label: "Refresh Required (5yr+)" }),
                  })}
                  {breakdownRow("Data Missing", riskMetrics.dataMissingCount, false, {
                    onClick: () => openDrillDown("Drill Down: Data Missing", (asset) => {
                      const essentialFields = [
                        asset?.serialNumber,
                        asset?.warrantyDate,
                        asset?.status || asset?.currentStatus,
                        asset?.owner,
                        asset?.farNumber,
                        asset?.nextAction,
                        asset?.datePurchased || asset?.purchaseDate,
                        asset?.costZAR || asset?.purchaseAmount,
                        asset?.physicalLocation || asset?.location,
                      ];
                      return essentialFields.some((field) => !field || String(field).trim() === "");
                    }, { type: "compliance", value: "dataMissing", label: "Data Missing" }),
                  })}
                  {breakdownRow("Zombie Assets (Retired Not In Storage)", riskMetrics.zombieCount, false, {
                    onClick: () => openDrillDown("Drill Down: Zombie Assets", (asset) => {
                      const status = getAssetStatus(asset).toLowerCase();
                      const location = getAssetLocation(asset).toLowerCase();
                      return status === "retired" && location !== "in storage";
                    }, { type: "compliance", value: "zombieAssets", label: "Zombie Assets" }),
                  })}
                  {breakdownRow("Placeholder Data Detected", riskMetrics.placeholderCount, false, {
                    onClick: () => openDrillDown("Drill Down: Placeholder Data", (asset) => {
                      const regex = /(tbc|pending|12345|n\/?a|0000)/i;
                      return regex.test(String(asset?.serialNumber || "")) || regex.test(String(asset?.farNumber || ""));
                    }, { type: "compliance", value: "placeholderData", label: "Placeholder Data" }),
                  })}
                </div>
              </div>
              <div className="tile-footer">
                <div style={{ ...summaryLineStyle, cursor: "pointer" }} onClick={() => openDrillDown("Drill Down: Risk Assets", (asset) => {
                  const status = getAssetStatus(asset).toLowerCase();
                  const location = getAssetLocation(asset).toLowerCase();
                  const owner = String(asset?.owner || asset?.assignedTo || "").trim().toLowerCase();
                  const regex = /(tbc|pending|12345|n\/?a|0000)/i;
                  const refresh = status === "live" && isHighRiskByAge(asset);
                  const unassigned = status === "live" && (!owner || owner === "unassigned");
                  const zombie = status === "retired" && location !== "in storage";
                  const placeholder = regex.test(String(asset?.serialNumber || "")) || regex.test(String(asset?.farNumber || ""));
                  return refresh || unassigned || zombie || placeholder;
                }, { type: "compliance", value: "riskAssets", label: "Risk Assets" })}>
                  Risk Value: {formatZAR(riskMetrics.riskValue)}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 2: Financial */}
          <div className={`tile double statCard ${isTileSelected({
            labels: ["Drill Down: PC Financial Value", "Drill Down: Server Financial Value", "Drill Down: Network Financial Value", "Drill Down: AV Financial Value", "Drill Down: Total Financial Value"],
          }) ? "tile-selected" : ""}`} style={{ ...metricTileStyle, maxHeight: "100%", overflow: "hidden" }}>
            <div className="tile-content-wrapper" style={{ maxHeight: "100%", overflow: "visible", position: "relative" }}>
              <div className="tile-watermark">{Icon(icons.value, 200)}</div>
              <div className="tile-body" style={{ overflow: "visible", padding: "0 20px" }}>
                <div className="tile-title" style={{ ...tileTitleStyle, marginTop: -30, position: "relative", zIndex: 4 }}>Financial Value (ZAR)</div>
                <div style={{ color: "#00b4ff", fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.2, marginTop: 2, marginBottom: 12 }}>
                  Total Investment: {formatZAR(totalInvestmentValue)}
                </div>
                <div className="breakdownList" style={{ ...breakdownListStyle, marginTop: 0, overflow: "hidden", borderBottom: "none" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, marginBottom: 4, color: "#b3e0ff", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <span>CATEGORY</span>
                    <span style={{ textAlign: "right" }}>ORIGINAL</span>
                    <span style={{ textAlign: "right" }}>CURR</span>
                  </div>

                  {financialRows.map((row) => (
                    <div
                      key={row.key}
                      className="breakdownList-row interactive-electric"
                      onClick={row.onClick}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          row.onClick();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, alignItems: "center", marginBottom: 3, lineHeight: 1.14, "--spark-speed": `${(0.42 + Math.random() * 0.15).toFixed(2)}s` }}
                    >
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 800, fontSize: 14 }}>{row.label}</span>
                      <strong style={{ whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatZAR(row.original)}</strong>
                      <strong style={{ whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatZAR(row.current)}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="tile-footer" style={{ marginTop: "auto", padding: 0, borderTop: "none" }}>
                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", marginTop: 10, padding: "8px 20px 0 20px", width: "100%", boxSizing: "border-box", cursor: "pointer" }} onClick={() => openDrillDown("Drill Down: Total Financial Value", () => true)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 12, overflow: "visible", color: "#00b4ff", fontWeight: 800, fontSize: "0.8rem", lineHeight: 1.2 }}>
                    <span style={{ whiteSpace: "nowrap", textAlign: "left" }}>Current Value:</span>
                    <strong style={{ whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums", overflow: "visible" }}>{formatZAR(totalCurrentFinancialValue)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tile 3: Lifecycle Forecast */}
          <div className={`tile statCard ${isTileSelected({
            labels: ["Drill Down: Replace", "Drill Down: Reassign", "Drill Down: Dispose", "Drill Down: Lifecycle Forecast"],
          }) ? "tile-selected" : ""}`} style={metricTileStyle}>
            <div className="tile-content-wrapper">
              <div className="tile-watermark">{Icon(icons.trending || FiTrendingUp, 200)}</div>
              <div className="tile-body">
                <div className="tile-title" style={tileTitleStyle}>Lifecycle Forecast</div>
                <div className="breakdownList" style={breakdownListStyle}>
                  {breakdownRow("Replacement Budget", formatZAR(lifecycleForecast.replacementBudget), false, {
                    onClick: () => openDrillDown("Drill Down: Replace", (a) => String(a?.nextAction || "").toLowerCase().trim() === "replace"),
                    valueColor: "#00b4ff",
                  })}
                  {breakdownRow("Reassignment Value", formatZAR(lifecycleForecast.reassignmentValue), false, {
                    onClick: () => openDrillDown("Drill Down: Reassign", (a) => String(a?.nextAction || "").toLowerCase().trim() === "reassign"),
                    valueColor: "#00b4ff",
                  })}
                  {breakdownRow("Pending Disposal", lifecycleForecast.pendingDisposal, false, {
                    onClick: () => openDrillDown("Drill Down: Dispose", (a) => String(a?.nextAction || "").toLowerCase().trim() === "dispose"),
                    valueColor: "#00b4ff",
                  })}
                </div>
              </div>
              <div className="tile-footer">
                <div style={{ ...summaryLineStyle, cursor: "pointer" }} onClick={() => openDrillDown("Drill Down: Lifecycle Forecast", (a) => ["replace", "reassign"].includes(String(a?.nextAction || "").toLowerCase().trim()))}>
                  Forecast Total: {formatZAR(lifecycleForecast.forecastTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 4: Warranty */}
          <div className={`tile statCard ${isTileSelected({
            labels: ["Drill Down: PC Warranty", "Drill Down: Server Warranty", "Drill Down: Network Warranty", "Drill Down: AV Warranty"],
          }) ? "tile-selected" : ""}`} style={metricTileStyle}>
            <div className="tile-content-wrapper">
              <div className="tile-watermark">{Icon(icons.warranty, 200)}</div>
              <div className="tile-body">
                <div className="tile-title" style={tileTitleStyle}>Warranty Health</div>
                <div className="breakdownList" style={breakdownListStyle}>
                  {breakdownRow("PCs", categoryStats.pc.warranty, false, {
                    onClick: () => openDrillDown("Drill Down: PC Warranty", (a) => getAssetCategory(a) === "computer" && (() => {
                      const raw = a?.warrantyDate || a?.dateWarrantyExpires || a?.warrantyExpiry || a?.warranty;
                      if (!raw) return false;
                      const d = new Date(raw);
                      return !Number.isNaN(d.getTime()) && d < new Date();
                    })()),
                    valueColor: categoryStats.pc.warranty > 0 ? "#ff7a45" : undefined,
                  })}
                  {breakdownRow("Servers", categoryStats.server.warranty, false, {
                    onClick: () => openDrillDown("Drill Down: Server Warranty", (a) => getAssetCategory(a) === "server" && (() => {
                      const raw = a?.warrantyDate || a?.dateWarrantyExpires || a?.warrantyExpiry || a?.warranty;
                      if (!raw) return false;
                      const d = new Date(raw);
                      return !Number.isNaN(d.getTime()) && d < new Date();
                    })()),
                    valueColor: categoryStats.server.warranty > 0 ? "#ff7a45" : undefined,
                  })}
                  {breakdownRow("Network", categoryStats.network.warranty, false, {
                    onClick: () => openDrillDown("Drill Down: Network Warranty", (a) => getAssetCategory(a) === "networking" && (() => {
                      const raw = a?.warrantyDate || a?.dateWarrantyExpires || a?.warrantyExpiry || a?.warranty;
                      if (!raw) return false;
                      const d = new Date(raw);
                      return !Number.isNaN(d.getTime()) && d < new Date();
                    })()),
                    valueColor: categoryStats.network.warranty > 0 ? "#ff7a45" : undefined,
                  })}
                  {breakdownRow("Audio Visual", categoryStats.av.warranty, false, {
                    onClick: () => openDrillDown("Drill Down: AV Warranty", (a) => getAssetCategory(a) === "av" && (() => {
                      const raw = a?.warrantyDate || a?.dateWarrantyExpires || a?.warrantyExpiry || a?.warranty;
                      if (!raw) return false;
                      const d = new Date(raw);
                      return !Number.isNaN(d.getTime()) && d < new Date();
                    })()),
                    valueColor: categoryStats.av.warranty > 0 ? "#ff7a45" : undefined,
                  })}
                </div>
              </div>
              <div className="tile-footer">
                <div style={summaryLineStyle}>
                  Total Expired: {categoryStats.pc.warranty + categoryStats.server.warranty + categoryStats.network.warranty + categoryStats.av.warranty}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 5: Next Action Summary */}
          <div className={`tile statCard ${isTileSelected({
            types: ["nextAction"],
            values: ["Replace", "Reassign", "Monitor", "Dispose"],
            labels: ["Replace", "Reassign", "Monitor", "Dispose", "Next Action"],
          }) ? "tile-selected" : ""}`} style={metricTileStyle}>
            <div className="tile-content-wrapper">
              <div className="tile-watermark">{Icon(icons.factory || FiBriefcase, 200)}</div>
              <div className="tile-body">
                <div className="tile-title" style={tileTitleStyle}>Next Action</div>
                <div className="breakdownList" style={breakdownListStyle}>
                  {nextActionSummary.rows.map((item) => (
                    <React.Fragment key={item.label}>
                      {breakdownRow(item.label, item.count, false, {
                        onClick: () => openDrillDown(`Drill Down: ${item.label}`, (a) => String(a?.nextAction || "").trim().toLowerCase() === item.label.toLowerCase(), { type: "nextAction", value: item.label, label: item.label }),
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="tile-footer">
                <div style={summaryLineStyle}>
                  Total Assets: {nextActionSummary.total}
                </div>
              </div>
            </div>
          </div>

          {/* Tile 6: Status */}
          <div className={`tile statCard ${isTileSelected({
            types: ["status", "location"],
            values: ["live", "broken", "retired", "stolen", "lost", "in storage", "at repairs"],
            labels: ["Live", "Broken", "Retired", "Stolen", "Lost", "In Storage", "At Repairs"],
          }) ? "tile-selected" : ""}`} style={metricTileStyle}>
            <div className="tile-content-wrapper">
              <div className="tile-watermark">{Icon(icons.storage, 200)}</div>
              <div className="tile-body">
                <div className="tile-title" style={tileTitleStyle}>Status Breakdown</div>
                <div className="breakdownList" style={breakdownListStyle}>
                  {breakdownRow("Live", statusSummary.live, false, { onClick: () => openDrillDown("Drill Down: Live Assets", (a) => getAssetStatus(a).toLowerCase() === "live", { type: "status", value: "Live", label: "Live" }) })}
                  {breakdownRow("Broken", statusSummary.broken, false, { onClick: () => openDrillDown("Drill Down: Broken Assets", (a) => getAssetStatus(a).toLowerCase() === "broken", { type: "status", value: "Broken", label: "Broken" }) })}
                  {breakdownRow("Retired", statusSummary.retired, false, { onClick: () => openDrillDown("Drill Down: Retired Assets", (a) => getAssetStatus(a).toLowerCase() === "retired", { type: "status", value: "Retired", label: "Retired" }) })}
                  {breakdownRow("Stolen", statusSummary.stolen, false, { onClick: () => openDrillDown("Drill Down: Stolen Assets", (a) => getAssetStatus(a).toLowerCase() === "stolen", { type: "status", value: "Stolen", label: "Stolen" }) })}
                  {breakdownRow("Lost", statusSummary.lost, false, { onClick: () => openDrillDown("Drill Down: Lost Assets", (a) => getAssetStatus(a).toLowerCase() === "lost", { type: "status", value: "Lost", label: "Lost" }) })}
                  {breakdownRow("In Storage", statusSummary.storage, false, { onClick: () => openDrillDown("Drill Down: In Storage", (a) => getAssetLocation(a).toLowerCase().includes("store"), { type: "location", value: "In Storage", label: "In Storage" }) })}
                  {breakdownRow("In Repair", statusSummary.repair, false, { onClick: () => openDrillDown("Drill Down: In Repair", (a) => getAssetLocation(a).toLowerCase().includes("repair"), { type: "location", value: "At Repairs", label: "At Repairs" }) })}
                </div>
              </div>
              <div className="tile-footer">
                <div style={summaryLineStyle}>
                  Total Assets: {unifiedAssets.length}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* --- ADDED ASSET MODAL --- */}
      {isModalOpen && (
        <div className="asset-modal-overlay" onClick={handleModalClose}>
          <div className="asset-modal" onClick={e => e.stopPropagation()}>
            <button className="btn-electric btnGhost asset-modal-close" onClick={handleModalClose}><span>×</span></button>
            <div className="asset-modal-title">ADD ASSET</div>
            <div className="asset-modal-button-box">
              <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('computer')}><span><FiMonitor size={24} /></span> <span>Computer</span></button>
              <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('server')}><span><FiServer size={24} /></span> <span>Server</span></button>
              <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('networking')}><span><FiCpu size={24} /></span> <span>Networking</span></button>
              <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('av')}><span><FiVideo size={24} /></span> <span>Audio Visual</span></button>
            </div>
          </div>
        </div>
      )}
    </DetailsLayout>
  );
}