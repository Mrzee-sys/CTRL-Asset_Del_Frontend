import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/DetailPageLayout.css";
import "../../styles/Register.css";
import { fetchOrgs } from "./peporgApi";

export default function PeporgRegister() {
    const navigate = useNavigate();

    const [q, setQ] = useState("");
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);

    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    // Debounce search so we don't spam the API
    const [debouncedQ, setDebouncedQ] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        let alive = true;

        async function load() {
            setErr("");
            setLoading(true);

            try {
                const data = await fetchOrgs({ search: debouncedQ, page, limit });
                if (!alive) return;

                setRows(Array.isArray(data?.rows) ? data.rows : []);
                setTotal(Number(data?.total || 0));
                setTotalPages(Number(data?.totalPages || 1));
            } catch (e) {
                if (!alive) return;
                setRows([]);
                setTotal(0);
                setTotalPages(1);
                setErr(e?.message || "Failed to load organisations");
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [debouncedQ, page, limit]);

    const fmtDateTime = useMemo(() => {
        return (d) => {
            if (!d) return "—";
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return "—";
            return dt.toLocaleString();
        };
    }, []);

    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
        <div className="assetPage">
            <div className="assetShell">
                {/* HEADER */}
                <header className="assetHeader">
                    <div className="assetHeader__nav">
                        <button
                            className="btn btnGhost"
                            type="button"
                            onClick={() => navigate("/")}
                        >
                            ← Back
                        </button>
                    </div>

                    <div className="assetHeader__main">
                        <div className="assetHeader__titleBlock">
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    justifyContent: "center"
                                }}
                            >
                                <h1 className="assetHeader__title" style={{ margin: 0 }}>
                                    People & Organisations
                                </h1>
                                <span className="pill pillLive">Register</span>
                            </div>

                            <div
                                className="assetHeader__meta"
                                style={{ marginTop: 4, justifyContent: "center" }}
                            >
                                <span className="metaText">Organisations</span>
                                <span className="metaDot">•</span>
                                <span className="metaText">
                                    Search and manage organisations
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="assetHeader__right">
                        <div className="auditMeta">
                            <div className="auditRow">
                                <span className="auditLabel">Total</span>
                                <span className="auditValue">{String(total)}</span>
                            </div>
                            <div className="auditRow">
                                <span className="auditLabel">Page</span>
                                <span className="auditValue">
                                    {page} / {totalPages}
                                </span>
                            </div>
                        </div>

                        <div className="headerLogos">
                            <div className="logoBox" title="Organisations">
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
                        <div className="panel__title">Organisation Register</div>

                        {/* Toolbar */}
                        <div className="registerBar">
                            <div className="registerPrimary">
                                <button
                                    className="btn btnPrimary"
                                    type="button"
                                    onClick={() => navigate("/peporg/new")}
                                >
                                    + Add Organisation
                                </button>
                            </div>

                            <div className="registerSearch">
                                <input
                                    className="value registerSearchInput"
                                    placeholder="Search organisations..."
                                    value={q}
                                    onChange={(e) => {
                                        setQ(e.target.value);
                                        setPage(1);
                                    }}
                                />
                                <button
                                    className="btn btnGhost"
                                    type="button"
                                    onClick={() => setQ("")}
                                    disabled={!q.trim()}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Status */}
                        {err ? (
                            <div className="registerStatusRow registerError">{err}</div>
                        ) : null}
                        {loading ? (
                            <div className="registerStatusRow">Loading…</div>
                        ) : null}

                        {/* Table */}
                        <div className="registerTableWrap">
                            <table className="registerTable">
                                <thead>
                                    <tr>
                                        <th>Organisation Name</th>
                                        <th>Trading As</th>
                                        <th>Contact</th>
                                        <th>VAT / Tax</th>
                                        <th>Company Reg</th>
                                        <th>Last Updated</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {!loading && rows.length === 0 ? (
                                        <tr>
                                            <td className="registerEmpty" colSpan={6}>
                                                No organisations found.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((o) => (
                                            <tr
                                                key={o._id || o.id}
                                                className="registerRow"
                                                style={{ cursor: "pointer" }}
                                                title="Click to edit organisation"
                                                onClick={() =>
                                                    navigate(`/peporg/${o._id || o.id}`)
                                                }
                                            >
                                                <td className="registerStrong">
                                                    {o.orgName || "—"}
                                                </td>
                                                <td>{o.tradingAs || "—"}</td>
                                                <td>{o.contactNumber || "—"}</td>
                                                <td>{o.vatTaxNumber || "—"}</td>
                                                <td>{o.companyRegNumber || "—"}</td>
                                                <td>{fmtDateTime(o.updatedAt)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paging */}
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                marginTop: 12,
                                justifyContent: "flex-end"
                            }}
                        >
                            <button
                                className="btn btnGhost"
                                type="button"
                                onClick={() => setPage((p) => p - 1)}
                                disabled={!canPrev}
                            >
                                ← Prev
                            </button>
                            <button
                                className="btn btnGhost"
                                type="button"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!canNext}
                            >
                                Next →
                            </button>
                        </div>
                    </section>

                    <aside className="panel panelSticky">
                        <div className="panel__title">Quick Summary</div>

                        <div className="sideBlocks">
                            <div className="sideBlock">
                                <div className="sideBlock__title">What you’re seeing</div>
                                <div className="sideBlock__text">
                                    This register lists Organisations only. Click a row to
                                    open the Organisation + People card.
                                </div>
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">Flow</div>
                                <div className="sideBlock__text">
                                    Create Organisation first → once saved, the People Import
                                    section unlocks on the same card page.
                                </div>
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
}
