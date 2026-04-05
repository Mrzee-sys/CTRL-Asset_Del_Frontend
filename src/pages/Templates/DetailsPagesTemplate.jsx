import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// IMPORTANT:
// - This is a TEMPLATE file for cloning.
// - Keep layout + classNames identical across modules.
// - Only replace the MODULE CONTENT sections.

export default function DetailPageTemplate() {
    const navigate = useNavigate();

    // Create-mode draft timestamp (audit)
    const [draftStarted] = useState(() => new Date().toISOString());

    // Placeholder "record" to render View mode (optional)
    // Keep this minimal; actual modules will fetch from API
    const [record] = useState(null);

    // Toggle this while you build a new module
    const isCreate = true;

    const fmt = useMemo(() => {
        const dateTime = (d) => {
            if (!d) return "—";
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return "—";
            return dt.toLocaleString();
        };
        const text = (v) =>
            v === null || v === undefined || v === "" ? "—" : String(v);
        return { dateTime, text };
    }, []);

    // Placeholder audit fields (View mode would use record timestamps)
    const current = isCreate ? {} : record || {};
    const createdAt = current?.createdAt || "";
    const updatedAt = current?.updatedAt || "";

    return (
        <div className="assetPage">
            <div className="assetShell">

                {/* =====================================================
           HEADER (TEMPLATE) — DO NOT REARRANGE
           ===================================================== */}
                <header className="assetHeader">
                    <div className="assetHeader__nav">
                        <button className="btn btnGhost" onClick={() => navigate(-1)}>
                            ← Back
                        </button>
                    </div>

                    {/* Center title area */}
                    <div className="assetHeader__main">
                        <div className="assetHeader__titleBlock">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, justifyContent: "center" }}>
                                <h1 className="assetHeader__title" style={{ margin: 0 }}>
                                    Untitled Record
                                </h1>
                                <span className="pill pillLive">Active</span>
                            </div>

                            <div className="assetHeader__meta" style={{ marginTop: 4, justifyContent: "center" }}>
                                <span className="metaText">New Module</span>
                                <span className="metaDot">•</span>
                                <span className="metaText">
                                    {isCreate ? "Creating new record" : "Viewing record"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Audit + Logos/Icons */}
                    <div className="assetHeader__right">
                        <div className="auditMeta">
                            {isCreate ? (
                                <>
                                    <div className="auditRow">
                                        <span className="auditLabel">Draft started</span>
                                        <span className="auditValue">{fmt.dateTime(draftStarted)}</span>
                                    </div>
                                    <div className="auditRow">
                                        <span className="auditLabel">Last saved</span>
                                        <span className="auditValue">—</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="auditRow">
                                        <span className="auditLabel">Created</span>
                                        <span className="auditValue">{fmt.dateTime(createdAt)}</span>
                                    </div>
                                    <div className="auditRow">
                                        <span className="auditLabel">Last updated</span>
                                        <span className="auditValue">{fmt.dateTime(updatedAt)}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="headerLogos">
                            {/* Replace with avatar / company icon / entity icons */}
                            <div className="logoBox logoBox--big" title="Icon A">
                                <div style={{ fontWeight: 900 }}>A</div>
                            </div>
                            <div className="logoBox logoBox--big" title="Icon B">
                                <div style={{ fontWeight: 900 }}>B</div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* =====================================================
           BODY (TEMPLATE) — DO NOT REARRANGE
           ===================================================== */}
                <main className="assetGrid">

                    {/* LEFT PANEL: DETAILS */}
                    <section className="panel">
                        <div className="panel__title">Details</div>

                        {/* =====================================================
               MODULE CONTENT: FIELDS (SAFE TO EDIT)
               ===================================================== */}
                        <div className="fieldGrid">
                            <div className="field">
                                <div className="label">Field 1</div>
                                <input className="value" placeholder="Value..." />
                            </div>

                            <div className="field">
                                <div className="label">Field 2</div>
                                <input className="value" placeholder="Value..." />
                            </div>

                            <div className="field">
                                <div className="label">Field 3</div>
                                <input className="value" placeholder="Value..." />
                            </div>

                            <div className="field">
                                <div className="label">Field 4</div>
                                <input className="value" placeholder="Value..." />
                            </div>
                        </div>
                    </section>

                    {/* RIGHT PANEL: BLOCKS + ACTIONS */}
                    <aside className="panel panelSticky">
                        <div className="panel__title">Quick Summary</div>

                        {/* =====================================================
               MODULE CONTENT: SIDE BLOCKS (SAFE TO EDIT)
               ===================================================== */}
                        <div className="sideBlocks">
                            <div className="sideBlock">
                                <div className="sideBlock__title">Quick Summary</div>
                                <div className="sideBlock__text">Put summary rows here…</div>
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">Block 2</div>
                                <div className="sideBlock__text">Any supporting info…</div>
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">Block 3</div>
                                <div className="sideBlock__text">Links, tags, relationships…</div>
                            </div>

                            {/* Actions (always at bottom) */}
                            <div className="actionBlock">
                                <div className="actionBlock__buttons">
                                    <button className="btn btnPrimary" type="button">
                                        Save
                                    </button>
                                    <button className="btn btnPrimary" type="button" onClick={() => navigate(-1)}>
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
