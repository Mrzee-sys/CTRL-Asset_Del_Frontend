import React, { useEffect, useMemo, useState } from "react";
import OrganizationSelector from "../../components/OrganizationSelector";
import { useLocation, useNavigate } from "react-router-dom";
import { 
    FiPlus, FiSearch, FiChevronLeft, FiChevronRight, 
    FiServer, FiMonitor, FiCpu, FiVideo 
} from "react-icons/fi";
import CategoryDropdown from "./CategoryDropdown";
import { listComputers } from "../../data/Computer/Computer.repository.js";
import { listServers } from "../../data/Server/Server.repository.js";
import { listNetworkHardware } from "../../data/NetworkHardware/NetworkHardware.repository.js";
import { listAvequipment } from "../../data/Avequipment/Avequipment.repository.js";
import RegisterLayout from "../RegisterLayout";
import { useDashboardFilter } from "../../context/DashboardFilterContext";

// Styles
import "../../Styles/DetailPageLayout.css";
import "../../styles/Register.css";
import "./computerRegister.css";
import "./ComputerCard.css";
import "./asset-modal.css"; // Ensure your CSS has the cyan-glow styles

function pillClass(status) {
    const s = String(status || "").toLowerCase();
    if (s.includes("live") || s.includes("in use")) return "good";
    if (s.includes("repair")) return "warn";
    if (s.includes("retired")) return "bad";
    return "neutral";
}

export default function ComputerRegister() {
    const location = useLocation();
    const navigate = useNavigate();
    const { activeDashboardFilter, setActiveDashboardFilter, clearActiveDashboardFilter } = useDashboardFilter();
    const routeState = location.state || {};
    const incomingCategory = String(routeState.category || routeState.initialCategory || "").trim();

    // --- State Management ---
    const [assetCategory, setAssetCategory] = useState('all');
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [searchText, setSearchText] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState(String(routeState.initialFilterStatus || ""));
    const [locationFilter, setLocationFilter] = useState(String(routeState.initialFilterLocation || ""));
    const [unassignedOwnerFilter, setUnassignedOwnerFilter] = useState(Boolean(routeState.initialUnassignedOwner));
    const [placeholderDataFilter, setPlaceholderDataFilter] = useState(Boolean(routeState.initialPlaceholderData));
    const [refreshRequiredFilter, setRefreshRequiredFilter] = useState(String(routeState.initialRiskFilter || "") === "refreshRequired");
    const [warrantyStatusFilter, setWarrantyStatusFilter] = useState(String(routeState.warrantyStatus || ""));
    const [nextActionFilter, setNextActionFilter] = useState(
        String(routeState.filterType || "").toLowerCase() === "nextaction" ? String(routeState.filterValue || "") : ""
    );
    const [makeFilter, setMakeFilter] = useState(String(routeState.make || ""));
    const [manufacturerTopFilter, setManufacturerTopFilter] = useState(
        Array.isArray(routeState.manufacturerTop) ? routeState.manufacturerTop.map((m) => String(m || "").toLowerCase().trim()) : []
    );

    const normalizeId = (value) => {
        if (!value) return "";
        if (typeof value === "string") return value.trim();
        if (typeof value === "number") return String(value);
        if (typeof value === "object") {
            if (value._id) return normalizeId(value._id);
            if (value.id) return normalizeId(value.id);
            if (value.$oid) return normalizeId(value.$oid);
            if (typeof value.toString === "function") {
                const text = value.toString().trim();
                if (text && text !== "[object Object]") return text;
            }
        }
        return String(value).trim();
    };

    const clearDashboardDrivenFilters = () => {
        setStatusFilter("");
        setLocationFilter("");
        setUnassignedOwnerFilter(false);
        setPlaceholderDataFilter(false);
        setRefreshRequiredFilter(false);
        setWarrantyStatusFilter("");
        setNextActionFilter("");
        setMakeFilter("");
        setManufacturerTopFilter([]);
    };

    useEffect(() => {
        if (routeState.orgId) setSelectedOrgId(String(routeState.orgId));
        if (incomingCategory) setAssetCategory(incomingCategory);
        clearDashboardDrivenFilters();
        setStatusFilter(String(routeState.initialFilterStatus || ""));
        setLocationFilter(String(routeState.initialFilterLocation || ""));
        setUnassignedOwnerFilter(Boolean(routeState.initialUnassignedOwner));
        setPlaceholderDataFilter(Boolean(routeState.initialPlaceholderData));
        setRefreshRequiredFilter(
            String(routeState.initialRiskFilter || "") === "refreshRequired" ||
            String(routeState.filterType || "") === "refreshRequired"
        );
        setWarrantyStatusFilter(String(routeState.warrantyStatus || ""));
        setNextActionFilter(
            String(routeState.filterType || "").toLowerCase() === "nextaction" ? String(routeState.filterValue || "") : ""
        );
        setMakeFilter(String(routeState.make || ""));
        setManufacturerTopFilter(
            Array.isArray(routeState.manufacturerTop)
                ? routeState.manufacturerTop.map((m) => String(m || "").toLowerCase().trim())
                : []
        );

        if (routeState.dashboardFilter) {
            setActiveDashboardFilter(routeState.dashboardFilter);
        } else if (routeState.filterType || routeState.filterValue || routeState.make) {
            setActiveDashboardFilter({
                type: String(routeState.filterType || "legacy"),
                value: routeState.filterValue || routeState.make || routeState.initialFilterStatus || "",
                label: routeState.filterValue || routeState.make || routeState.initialFilterStatus || "",
                source: "assetDashboard",
                updatedAt: Date.now(),
            });
        }
        setPage(1);
    }, [routeState.orgId, incomingCategory, routeState.initialFilterStatus, routeState.initialFilterLocation, routeState.initialUnassignedOwner, routeState.initialPlaceholderData, routeState.initialRiskFilter, routeState.warrantyStatus, routeState.filterType, routeState.filterValue, routeState.make, routeState.manufacturerTop, routeState.dashboardFilter, setActiveDashboardFilter]);

    useEffect(() => {
        if (!activeDashboardFilter || activeDashboardFilter.source !== "assetDashboard") return;

        clearDashboardDrivenFilters();

        if (activeDashboardFilter.orgId) {
            setSelectedOrgId(String(activeDashboardFilter.orgId));
        }

        if (activeDashboardFilter.category) {
            setAssetCategory(String(activeDashboardFilter.category));
        }

        const label = String(activeDashboardFilter.label || activeDashboardFilter.value || "").trim();
        setSearchText(label);
        setActiveQuery("");

        const type = String(activeDashboardFilter.type || "").toLowerCase();
        const value = String(activeDashboardFilter.value || "").trim();

        if (type === "status") setStatusFilter(value);
        if (type === "manufacturer") setMakeFilter(value);
        if (type === "location") setLocationFilter(value);
        if (type === "nextaction") setNextActionFilter(value);

        if (type === "compliance") {
            if (value === "refreshRequired") setRefreshRequiredFilter(true);
            if (value === "unassignedCustody") setUnassignedOwnerFilter(true);
            if (value === "placeholderData") setPlaceholderDataFilter(true);
            if (value === "zombieAssets") {
                setStatusFilter("Retired");
                setLocationFilter("");
            }
        }

        setPage(1);
    }, [activeDashboardFilter]);

    // --- Data Loading ---
    async function loadData() {
        setLoading(true);
        setErr("");
        try {
            let data = { rows: [], total: 0, totalPages: 1 };

            if (assetCategory === "all") {
                const allParams = {
                    search: activeQuery,
                    orgId: selectedOrgId,
                    limit: 1000,
                };

                const [computersData, serversData, networkingData, avData] = await Promise.all([
                    listComputers({ ...allParams, category: "computer" }),
                    listServers(allParams),
                    listNetworkHardware(allParams),
                    listAvequipment(allParams),
                ]);

                const allRows = [
                    ...(Array.isArray(computersData?.rows) ? computersData.rows : []).map((r) => ({ ...r, __category: "computer" })),
                    ...(Array.isArray(serversData?.rows) ? serversData.rows : []).map((r) => ({ ...r, __category: "server" })),
                    ...(Array.isArray(networkingData?.rows) ? networkingData.rows : []).map((r) => ({ ...r, __category: "networking" })),
                    ...(Array.isArray(avData?.rows) ? avData.rows : []).map((r) => ({ ...r, __category: "av" })),
                ]
                    .slice()
                    .sort((a, b) => new Date(b?.createdAt ?? 0) - new Date(a?.createdAt ?? 0));

                let scopedRows = allRows;
                const hasScopedAssetIds = activeDashboardFilter?.source === "assetDashboard" && Array.isArray(activeDashboardFilter?.assetIds);
                if (hasScopedAssetIds) {
                    const allowedIds = new Set(
                        activeDashboardFilter.assetIds
                            .map((id) => normalizeId(id))
                            .filter(Boolean)
                    );
                    scopedRows = allRows.filter((row) => {
                        const rowName = row?.computerName || row?.serverName || row?.hostname || row?.deviceName || row?.equipmentType || row?.name || "-";
                        const fallbackRowId = `${row?.serialNumber || "no-serial"}-${rowName}`;
                        const rowId = normalizeId(row?._id || row?.id) || fallbackRowId;
                        return allowedIds.has(rowId);
                    });
                }

                const totalAll = scopedRows.length;
                const start = (page - 1) * limit;
                const end = start + limit;
                data = {
                    rows: scopedRows.slice(start, end),
                    total: totalAll,
                    totalPages: Math.max(1, Math.ceil(totalAll / limit)),
                };
            } else if (assetCategory === "computer") {
                data = await listComputers({
                    search: activeQuery,
                    page,
                    limit,
                    orgId: selectedOrgId,
                    category: "computer",
                });
            } else if (assetCategory === "server") {
                data = await listServers({
                    search: activeQuery,
                    page,
                    limit,
                    orgId: selectedOrgId,
                });
            } else if (assetCategory === "networking") {
                data = await listNetworkHardware({
                    search: activeQuery,
                    page,
                    limit,
                    orgId: selectedOrgId,
                });
            } else if (assetCategory === "av") {
                data = await listAvequipment({
                    search: activeQuery,
                    page,
                    limit,
                    orgId: selectedOrgId,
                });
            }

            setRows(Array.isArray(data?.rows) ? data.rows : []);
            setTotal(data?.total ?? 0);
            setTotalPages(data?.totalPages ?? 1);
        } catch (e) {
            setErr("Failed to load records");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [selectedOrgId, page, limit, activeQuery, assetCategory, activeDashboardFilter]);

    // --- Handlers ---
    const handleModalOpen = () => setIsModalOpen(true);
    const handleModalClose = () => setIsModalOpen(false);
    
    const onSearch = () => { setActiveQuery(searchText); setPage(1); };
    const onClearSearch = () => {
        setSearchText("");
        setActiveQuery("");
        clearDashboardDrivenFilters();
        clearActiveDashboardFilter();
        setPage(1);
    };
    
    // Finalized: Modal asset type selection routes
    const handleAssetTypeSelect = (type) => {
        const routeMap = {
            computer: '/computers/new',
            server: '/servers/new',
            networking: '/networking/new',
            av: '/av-equipment/new'
        };
        setIsModalOpen(false);
        if (routeMap[type]) {
            navigate(routeMap[type], { state: { orgId: selectedOrgId } });
        }
    };

    const detailRouteByCategory = {
        computer: '/computers',
        server: '/servers',
        networking: '/networking',
        av: '/av-equipment',
    };

    const getRowCategory = (row) => {
        if (row?.__category) return row.__category;
        if (assetCategory !== "all") return assetCategory;

        const explicit = String(row?.category || "").toLowerCase().trim();
        if (["computer", "server", "networking", "av"].includes(explicit)) return explicit;
        if (row?.computerName) return "computer";
        if (row?.serverName || row?.hostname) return "server";
        if (row?.deviceName) return "networking";
        if (row?.equipmentType) return "av";
        return "computer";
    };

    const getAssetName = (row, rowCategory) => {
        if (rowCategory === "computer") return row.computerName || row.name || "-";
        if (rowCategory === "server") return row.serverName || row.hostname || "-";
        if (rowCategory === "networking") return row.deviceName || "-";
        if (rowCategory === "av") return row.equipmentType || "-";
        return row.name || "-";
    };

    const displayRows = useMemo(() => {
        const containsPlaceholder = (value) => {
            const text = String(value || "").toLowerCase();
            return text.includes("tbc") || text.includes("123") || text.includes("pending");
        };

        const isUnassignedOwner = (row) => {
            const owner = String(row?.owner || "").toLowerCase().trim();
            const ownerName = String(row?.ownerName || "").toLowerCase().trim();
            return !owner || owner === "unassigned" || ownerName === "unassigned" || ownerName === "-";
        };

        return rows.filter((r) => {
            const status = String(r?.status || "").toLowerCase().trim();
            const physicalLocation = String(r?.physicalLocation || r?.location || "").toLowerCase().trim();
            const rowCategory = getRowCategory(r);

            const normalizedSelectedCategory = String(assetCategory || "all").toLowerCase().trim();
            const matchesCategory = normalizedSelectedCategory === "all" || String(rowCategory || "").toLowerCase().trim() === normalizedSelectedCategory;
            if (!matchesCategory) return false;

            if (statusFilter && status !== String(statusFilter).toLowerCase().trim()) return false;
            if (locationFilter && physicalLocation !== String(locationFilter).toLowerCase().trim()) return false;

            if (unassignedOwnerFilter && !isUnassignedOwner(r)) return false;
            if (placeholderDataFilter && !(containsPlaceholder(r?.serialNumber) || containsPlaceholder(r?.farNumber))) return false;

            if (refreshRequiredFilter) {
                const status = String(r?.status || r?.currentStatus || r?.systemStatus || "").toLowerCase().trim();
                if (status !== "live") return false;
                const rawDate = r?.datePurchased || r?.purchaseDate || r?.dateOfPurchase;
                if (!rawDate) return false;
                const purchaseDate = new Date(rawDate);
                if (Number.isNaN(purchaseDate.getTime())) return false;
                const threshold = new Date();
                threshold.setFullYear(threshold.getFullYear() - 5);
                if (purchaseDate > threshold) return false;
            }

            if (String(warrantyStatusFilter).toLowerCase() === "expired") {
                const rawWarrantyDate = r?.warrantyDate || r?.dateWarrantyExpires;
                if (!rawWarrantyDate) return false;
                const warrantyDate = new Date(rawWarrantyDate);
                if (Number.isNaN(warrantyDate.getTime())) return false;
                if (!(warrantyDate < new Date())) return false;
            }

            if (nextActionFilter) {
                const rowNextAction = String(r?.nextAction || "").toLowerCase().trim();
                if (rowNextAction !== String(nextActionFilter).toLowerCase().trim()) return false;
            }

            if (makeFilter) {
                const rowMake = String(r?.make || r?.manufacturer || r?.brand || r?.vendor || "").trim();
                if (String(makeFilter).toLowerCase() === "other") {
                    if (manufacturerTopFilter.includes(rowMake.toLowerCase())) return false;
                } else if (rowMake.toLowerCase() !== String(makeFilter).toLowerCase().trim()) {
                    return false;
                }
            }

            const hasScopedAssetIds = activeDashboardFilter?.source === "assetDashboard" && Array.isArray(activeDashboardFilter?.assetIds);
            if (hasScopedAssetIds) {
                const fallbackRowId = `${r?.serialNumber || "no-serial"}-${getAssetName(r, rowCategory)}`;
                const rowId = normalizeId(r?._id || r?.id) || fallbackRowId;
                const allowedIds = activeDashboardFilter.assetIds
                    .map((id) => normalizeId(id))
                    .filter(Boolean);
                if (!allowedIds.includes(rowId)) return false;
            }

            return true;
        });
    }, [rows, statusFilter, locationFilter, unassignedOwnerFilter, placeholderDataFilter, refreshRequiredFilter, warrantyStatusFilter, nextActionFilter, makeFilter, manufacturerTopFilter, activeDashboardFilter]);

    // --- UI Components ---

    // FIXED: Wrapped in Fragment to avoid "Adjacent JSX elements" error
    const toolbarContent = (
        <>
            {selectedOrgId ? (
                <button className="btn-electric btnPrimary cr-primary" onClick={handleModalOpen} type="button">
                    <span><FiPlus /> Add Asset</span>
                </button>
            ) : (
                <span style={{ color: 'var(--muted-color)', fontSize: 14, marginRight: 16 }}>
                    Select organization to enable actions
                </span>
            )}

            <span style={{ marginLeft: 28, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>
                    Category:
                </span>
                <CategoryDropdown value={assetCategory} onChange={e => setAssetCategory(e.target.value)} />
            </span>

            <span style={{ marginLeft: 28 }}>
                <OrganizationSelector
                    selectedOrgId={selectedOrgId}
                    setSelectedOrgId={setSelectedOrgId}
                    onOrgChange={setSelectedOrgId}
                />
            </span>
        </>
    );

    const clearDashboardFilter = () => {
        clearDashboardDrivenFilters();
        clearActiveDashboardFilter();
        setPage(1);
    };

    return (
        <RegisterLayout
            title="Asset Register"
            subtitle="Centralized Hardware Inventory Management"
            totalCount={total}
            pageInfo={`${page} / ${totalPages}`}
            toolbarContent={toolbarContent}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div className="cr-muted" style={{ display: "flex", alignItems: "center" }}>
                    {loading ? "Refreshing..." : `Total ${displayRows.length} Assets Found`}
                </div>

                <div className="cr-search" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 0 }}>
                    <input
                        className="cr-searchInput"
                        placeholder="Search by Name, Serial, or Asset Tag..."
                        value={searchText}
                        onChange={(e) => {
                            const nextValue = e.target.value;
                            setSearchText(nextValue);
                            if (!String(nextValue).trim()) {
                                setActiveQuery("");
                                clearDashboardDrivenFilters();
                                clearActiveDashboardFilter();
                                setPage(1);
                            }
                        }}
                        onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    />
                    <button className="btn-electric btnPrimary cr-searchBtn" onClick={onSearch}><span><FiSearch /> Search</span></button>
                    {activeQuery && <button className="btn-electric btnGhost cr-ghost" onClick={onClearSearch}><span>Clear</span></button>}
                    {activeDashboardFilter?.source === "assetDashboard" && (
                        <button
                            className="btn-electric btnGhost"
                            type="button"
                            onClick={clearDashboardFilter}
                            style={{
                                display: "none",
                                border: "1px solid #00d4ff",
                                background: "rgba(0,212,255,0.10)",
                                color: "#00b4ff",
                                borderRadius: 999,
                                padding: "8px 12px",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            <span>Filter: Refresh Required (5yr+) �</span>
                        </button>
                    )}
                    <button className="btn-electric btnGhost btn-icon-round cr-iconBtn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}><span><FiChevronLeft /></span></button>
                    <button className="btn-electric btnGhost btn-icon-round cr-iconBtn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><span><FiChevronRight /></span></button>
                </div>
            </div>

            <div className="cr-tableScroll">
                <table className="cr-table">
                    <thead>
                        <tr>
                            <th>Asset Tag</th>
                            <th>Device Name</th>
                            <th>Status</th>
                            <th>Owner</th>
                            <th>Model</th>
                            <th>Current Status</th>
                            <th>Serial Number</th>
                            <th style={{ minWidth: 90 }}>OS</th>
                            <th style={{ minWidth: 80 }}>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.length === 0 && !loading ? (
                            <tr><td colSpan={9} className="cr-empty">No assets found in this scope.</td></tr>
                        ) : (
                            displayRows.map((r) => (
                                <tr key={r._id || r.id}>
                                    <td className="cr-openCell">
                                        <button
                                            className="btn-electric btnGhost cr-openBtn"
                                            onClick={() => {
                                                const id = r._id || r.id;
                                                const rowCategory = getRowCategory(r);
                                                const baseRoute = detailRouteByCategory[rowCategory] || "/computers";
                                                navigate(`${baseRoute}/${id}`);
                                            }}
                                        >
                                            <span>{r.assetTag || r.farNumber || "OPEN"}</span>
                                        </button>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{getAssetName(r, getRowCategory(r))}</td>
                                    <td>
                                        <span className={`cr-pill cr-pill--${pillClass(r.status)}`}>
                                            {r.status || "Unknown"}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--primary-blue)' }}>{r.ownerName || r.owner || "-"}</td>
                                    <td>{r.model || "-"}</td>
                                    <td>{r.currentStatus || r.status || "-"}</td>
                                    <td>{r.serialNumber || "-"}</td>
                                    <td>{r.os || "-"}</td>
                                    <td>{
                                        r.costZAR !== undefined && r.costZAR !== null
                                            ? `R${Number(r.costZAR).toLocaleString()}`
                                            : r.purchaseAmount !== undefined && r.purchaseAmount !== null
                                                ? `R${Number(r.purchaseAmount).toLocaleString()}`
                                                : "-"
                                    }</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- INTELLIGENT RISK THEMED MODAL --- */}
            {isModalOpen && (
                <div className="asset-modal-overlay" onClick={handleModalClose}>
                    <div className="asset-modal" onClick={e => e.stopPropagation()}>
                        <button className="btn-electric btnGhost asset-modal-close" onClick={handleModalClose}><span>�</span></button>
                        <div className="asset-modal-title">ADD ASSET</div>
                        <div className="asset-modal-button-box">
                            <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('computer')}>
                                <span><FiMonitor size={24} style={{ minWidth: 28 }} /></span> <span>Computer</span>
                            </button>
                            <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('server')}>
                                <span><FiServer size={24} style={{ minWidth: 28 }} /></span> <span>Server</span>
                            </button>
                            <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('networking')}>
                                <span><FiCpu size={24} style={{ minWidth: 28 }} /></span> <span>Networking</span>
                            </button>
                            <button className="btn-electric btnPrimary asset-modal-btn" onClick={() => handleAssetTypeSelect('av')}>
                                <span><FiVideo size={24} style={{ minWidth: 28 }} /></span> <span>Audio Visual</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
           
        </RegisterLayout>
    );
}