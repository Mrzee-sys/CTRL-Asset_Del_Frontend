import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Zbot_Fields from "../../components/Zbot_Fields";

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
                    <PageHeader
                        title={isCreate ? "Untitled Record" : (record?.computerName || "Computer Details")}
                        subtitle={`New Module � ${isCreate ? "Creating new record" : "Viewing record"}`}
                        pillText={isCreate ? "Active" : (record?.status || "Active")}
                        totalCount={undefined}
                        pageInfo={undefined}
                        leftIconLabel="A"
                        rightIconLabel="B"
                    />
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
           BODY (TEMPLATE) � DO NOT REARRANGE
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
                                <Zbot_Fields className="value" placeholder="Value..." label="Field 1" name="field1" />
                            </div>

                            <div className="field">
                                <div className="label">Field 2</div>
                                <Zbot_Fields className="value" placeholder="Value..." label="Field 2" name="field2" />
                            </div>

                            <div className="field">
                                <div className="label">Field 3</div>
                                <Zbot_Fields className="value" placeholder="Value..." label="Field 3" name="field3" />
                            </div>

                            <div className="field">
                                <div className="label">Field 4</div>
                                <Zbot_Fields className="value" placeholder="Value..." label="Field 4" name="field4" />
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
                                <div className="sideBlock__text">Put summary rows here�</div>
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">Block 2</div>
                                <div className="sideBlock__text">Any supporting info�</div>
                            </div>

                            <div className="sideBlock">
                                <div className="sideBlock__title">Block 3</div>
                                <div className="sideBlock__text">Links, tags, relationships�</div>
                            </div>

                            {/* Actions (always at bottom) */}
                            <div className="actionBlock">
                                <div className="actionBlock__buttons">
                                    <button className="btn-electric btnPrimary" type="button">
                                        <span>Save</span>
                                    </button>
                                    <button className="btn-electric btnPrimary" type="button" onClick={() => navigate(-1)}>
                                        <span>Cancel</span>
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
