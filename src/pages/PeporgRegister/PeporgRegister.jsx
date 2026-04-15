import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RegisterLayout from "../RegisterLayout";
import { FiPlus, FiSearch } from "react-icons/fi";
import { fetchOrgs } from "./peporgApi";
import "../../styles/DetailPageLayout.css";
import "../../styles/Register.css";

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

    // Toolbar content for RegisterLayout
    const toolbarContent = (
        <>
            {/* UPDATED: Changed class to btn btnPrimary to trigger magic border */}
            <button className="btn btnPrimary" onClick={() => navigate("/peporg/new") } type="button">
                <FiPlus /> Add Organisation
            </button>
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
        </>
    );

    // Status and paging row
    const statusRow = (
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
            {/* UPDATED: Changed to btnPrimary so they also glow/trace */}
            <button
                className="btn btnPrimary"
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={!canPrev}
            >
                ← Prev
            </button>
            <button
                className="btn btnPrimary"
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
            >
                Next →
            </button>
        </div>
    );

    return (
        <RegisterLayout
            title="People & Organisations"
            subtitle="Organisations • Search and manage organisations"
            totalCount={total}
            toolbarContent={toolbarContent}
        >
            {err ? (
                <div className="registerStatusRow registerError">{err}</div>
            ) : null}
            {loading ? (
                <div className="registerStatusRow">Loading…</div>
            ) : null}
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
            {statusRow}
        </RegisterLayout>
    );
}