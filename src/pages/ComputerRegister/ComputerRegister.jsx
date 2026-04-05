import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPlus, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { fetchComputers } from "./computerApi";
import "../../styles/DetailPageLayout.css";
import "../../styles/Register.css";
import "./computerRegister.css";
import "./ComputerCard.css";

export default function ComputerRegister() {
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [searchText, setSearchText] = useState("");
    const [activeQuery, setActiveQuery] = useState("");

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    async function loadData(query = activeQuery, nextPage = page, nextLimit = limit) {
        setLoading(true);
        setErr("");

        try {
            const data = await fetchComputers({ search: query, page: nextPage, limit: nextLimit });

            // ✅ Option 2 payload shape: { rows, page, limit, total, totalPages }
            setRows(Array.isArray(data?.rows) ? data.rows : []);
            setPage(data?.page ?? nextPage);
            setLimit(data?.limit ?? nextLimit);
            setTotal(data?.total ?? 0);
            setTotalPages(data?.totalPages ?? 1);
        } catch (e) {
            setErr(e?.message || "Failed to load computers");
            setRows([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }

    // Initial load
    useEffect(() => {
        loadData("", 1, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredRows = useMemo(() => {
        // Server-side search already happens via loadData(q).
        // This client-side filter is just a fallback for quick matching on the current page.
        if (!activeQuery) return rows;

        const q = activeQuery.toLowerCase();
        return rows.filter((r) =>
            [
                r.assetTag,
                r.openId,
                r.computerName,
                r.status,
                r.owner,
                r.previousOwner,
                r.type,
                r.make,
                r.model,
                r.serialNumber,
                r.os,
                r.location,
                r.company,
                r.farNumber,
            ]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [rows, activeQuery]);

    function onSearch() {
        const q = searchText.trim();
        setActiveQuery(q);
        setPage(1);
        loadData(q, 1, limit); // server-side search + reset to page 1
    }

    function onClearSearch() {
        setSearchText("");
        setActiveQuery("");
        setPage(1);
        loadData("", 1, limit);
    }

    function onAddAsset() {
        // ✅ Wired: route to a "new asset" page
        // You’ll handle this route in App.jsx: /computers/new
        navigate("/computers/new");
    }

    function onOpenAsset(id) {
        if (!id) return;
        navigate(`/computers/${id}`);
    }

    function onRefresh() {
        loadData(activeQuery, page, limit);
    }

    function goPrev() {
        if (page <= 1) return;
        const next = page - 1;
        setPage(next);
        loadData(activeQuery, next, limit);
    }

    function goNext() {
        if (page >= totalPages) return;
        const next = page + 1;
        setPage(next);
        loadData(activeQuery, next, limit);
    }

    function onChangeLimit(e) {
        const nextLimit = parseInt(e.target.value, 10) || 25;
        setLimit(nextLimit);
        setPage(1);
        loadData(activeQuery, 1, nextLimit);
    }

    return (
        <div className="cr-page">
            {/* Header Row */}
            <div className="cr-header">
                <button className="cr-back" onClick={() => navigate("/")} type="button">
                    <FiArrowLeft /> Back
                </button>

                <h1 className="cr-title">Computer Register</h1>

                <div className="cr-headerRight">
                    <button
                        className="cr-iconBtn"
                        onClick={onRefresh}
                        type="button"
                        title="Refresh"
                        disabled={loading}
                    >
                        <FiRefreshCw />
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="cr-toolbar">
                <button className="cr-primary" onClick={onAddAsset} type="button">
                    <FiPlus /> Add Asset
                </button>

                <div className="cr-search">
                    <input
                        className="cr-searchInput"
                        placeholder="Search computers..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => (e.key === "Enter" ? onSearch() : null)}
                    />
                    <button className="cr-searchBtn" onClick={onSearch} type="button" disabled={loading}>
                        <FiSearch /> Search
                    </button>

                    {(activeQuery || searchText) && (
                        <button className="cr-ghost" onClick={onClearSearch} type="button" disabled={loading}>
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Status + Pagination Row */}
            <div className="cr-statusRow" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                    {loading ? (
                        <span className="cr-muted">Loading computers…</span>
                    ) : err ? (
                        <span className="cr-error">{err}</span>
                    ) : (
                        <span className="cr-muted">
                            Showing <b>{filteredRows.length}</b> on this page • Total <b>{total}</b> computer(s)
                            {activeQuery ? (
                                <>
                                    {" "}
                                    for “<b>{activeQuery}</b>”
                                </>
                            ) : null}
                        </span>
                    )}
                </div>

                {/* Pagination controls */}
                <div className="cr-pager" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="cr-muted">
                        Page <b>{page}</b> of <b>{totalPages || 1}</b>
                    </span>

                    <button className="cr-iconBtn" type="button" onClick={goPrev} disabled={loading || page <= 1} title="Previous page">
                        <FiChevronLeft />
                    </button>

                    <button
                        className="cr-iconBtn"
                        type="button"
                        onClick={goNext}
                        disabled={loading || page >= totalPages}
                        title="Next page"
                    >
                        <FiChevronRight />
                    </button>

                    <select
                        className="cr-select"
                        value={limit}
                        onChange={onChangeLimit}
                        disabled={loading}
                        title="Rows per page"
                    >
                        <option value={10}>10 / page</option>
                        <option value={25}>25 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="cr-tableWrap">
                <table className="cr-table">
                    <thead>
                        <tr>
                            <th>Open</th>
                            <th>Computer Name</th>
                            <th>Status</th>
                            <th>Owner</th>
                            <th>Previous Owner</th>
                            <th>Type</th>
                            <th>Make</th>
                            <th>Model</th>
                            <th>Serial Number</th>
                            <th>OS</th>
                        </tr>
                    </thead>

                    <tbody>
                        {!loading && filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="cr-empty">
                                    No results found.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((r) => (
                                <tr key={r._id}>
                                    <td className="cr-openCell">
                                        <button
                                            type="button"
                                            className="cr-openBtn"
                                            onClick={() => onOpenAsset(r._id)}
                                            title="Open record"
                                            disabled={!r._id}
                                        >
                                            {r.openId ?? r.assetTag ?? "Open"}
                                        </button>
                                    </td>

                                    <td>{r.computerName ?? r.name ?? "-"}</td>

                                    <td>
                                        <span className={`cr-pill cr-pill--${pillClass(r.status)}`}>
                                            {r.status ?? "-"}
                                        </span>
                                    </td>

                                    <td>{r.owner ?? r.assignedTo ?? "-"}</td>
                                    <td>{r.previousOwner ?? "-"}</td>
                                    <td>{r.type ?? "-"}</td>
                                    <td>{r.make ?? "-"}</td>
                                    <td>{r.model ?? "-"}</td>
                                    <td>{r.serialNumber ?? "-"}</td>
                                    <td>{r.os ?? "-"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function pillClass(status) {
    const s = String(status || "").toLowerCase();
    if (s.includes("live") || s.includes("in use")) return "good";
    if (s.includes("repair")) return "warn";
    if (s.includes("retired")) return "bad";
    return "neutral";
}