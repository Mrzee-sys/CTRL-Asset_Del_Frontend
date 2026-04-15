// =====================================================
// ComputerCard.jsx (CLEAN REWRITE)
// - Create + View modes, using DetailsLayout

                import React, { useState, useEffect } from "react";
                import { useNavigate, useParams } from "react-router-dom";
                import DetailsLayout from "../DetailsLayout";
                import { getComputerById, createComputer, updateComputer } from "../../data/Computers/computer.repository";
                import { getWarrantySite } from "../../utils/warrantySites";
                // import { getModelsForMake, addModelForMake, clearModelCatalog } from "../../utils/modelCatalog";
                // If you need a text utility, define it here or import from another utility file.
                const fmt = { text: (v) => v ?? "" };



                const initialForm = {
                  computerName: "",
                  serialNumber: "",
                  make: "",
                  model: "",
                  farNumber: "",
                  os: "",
                  company: "",
                  location: "",
                  datePurchased: "",
                  warrantyDate: "",
                  purchaseAmount: "",
                  owner: "",
                  status: "",
                };

                export default function ComputerCard() {
                  const navigate = useNavigate();
                  const { id } = useParams();
                  const isCreate = id === "new";

                  const [form, setForm] = useState(initialForm);
                  const [computer, setComputer] = useState(null);
                  const [loading, setLoading] = useState(!isCreate);
                  const [saving, setSaving] = useState(false);
                  const [error, setError] = useState("");
                  const [qrImage, setQrImage] = useState(null);

                  useEffect(() => {
                    if (!isCreate) {
                      setLoading(true);
                      getComputerById(id)
                        .then((data) => {
                          setComputer(data);
                          setForm({ ...initialForm, ...data });
                        })
                        .catch(() => setError("Failed to load computer."))
                        .finally(() => setLoading(false));
                    }
                  }, [id, isCreate]);

                  // Save handler
                  const onSave = async () => {
                    setSaving(true);
                    setError("");
                    try {
                      if (isCreate) {
                        await createComputer(form);
                      } else {
                        await updateComputer(id, form);
                      }
                      navigate("/computers");
                    } catch (e) {
                      setError("Failed to save computer.");
                    } finally {
                      setSaving(false);
                    }
                  };

                  // Sidebar content
                  const sidebarContent = (
                    <>
                      <div className="panel__title">Quick Summary</div>
                      <div className="sideBlocks">
                        <div className="sideBlock">
                          <div className="sideBlock__title">Quick Summary</div>
                          <div className="summary">
                            <div className="summaryRow">
                              <div className="summaryLabel">Status</div>
                              <div className="summaryValue">
                                <span className={`pill ${form.status ? "status-" + form.status.toLowerCase() : ""}`}>{form.status || "—"}</span>
                              </div>
                            </div>
                            <div className="summaryRow">
                              <div className="summaryLabel">Make</div>
                              <div className="summaryValue">{form.make || "—"}</div>
                            </div>
                            <div className="summaryRow">
                              <div className="summaryLabel">Model</div>
                              <div className="summaryValue">{form.model || "—"}</div>
                            </div>
                            <div className="summaryRow">
                              <div className="summaryLabel">Owner</div>
                              <div className="summaryValue">{form.owner || "—"}</div>
                            </div>
                          </div>
                        </div>
                        <div className="sideBlock">
                          <div className="sideBlock__title">Warranty Site</div>
                          {getWarrantySite(form.make) ? (
                            <a className="warrantyLink" href={getWarrantySite(form.make).url} target="_blank" rel="noreferrer">
                              {getWarrantySite(form.make).label}
                            </a>
                          ) : (
                            <div className="sideBlock__text">
                              No warranty site configured for <b>{form.make || "this make"}</b>.
                            </div>
                          )}
                        </div>
                        <div className="sideBlock">
                          <div className="sideBlock__title">Applications Assigned</div>
                          {/* Placeholder for applications assigned */}
                          <div className="sideBlock__text">No applications assigned yet.</div>
                        </div>
        <div className="actionBlock" style={{ marginTop: 24 }}>
          <div className="actionBlock__buttons">
            <button className="btn btnPrimary" type="button" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="btn btnPrimary" type="button" onClick={() => navigate("/computers")}
              disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
                      </div>
                    </>
                  );

                  if (loading) return <div>Loading...</div>;
                  if (error) return <div className="error">{error}</div>;

                  return (
                    <DetailsLayout
                      title={isCreate ? "New Computer" : fmt.text(computer?.computerName)}
                      subtitle={isCreate ? "Create a new computer asset" : `Computer Asset • Asset ID: ${fmt.text(computer?.openId || computer?._id)}`}
                      statusPills={isCreate ? [] : [{ text: fmt.text(computer?.status), className: form.status ? "status-" + form.status.toLowerCase() : "" }]}
                      sidebarContent={sidebarContent}
                    >
                      <div className="panel__title">Details</div>
                      <div className="fieldGrid">
                        <div className="field">
                          <div className="label">Computer Name</div>
                          <input className="value" value={form.computerName || ""} onChange={e => setForm(f => ({ ...f, computerName: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Serial Number</div>
                          <input className="value" value={form.serialNumber || ""} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Make</div>
                          <input className="value" value={form.make || ""} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Model</div>
                          <input className="value" value={form.model || ""} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">FAR Number</div>
                          <input className="value" value={form.farNumber || ""} onChange={e => setForm(f => ({ ...f, farNumber: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Operating System</div>
                          <input className="value" value={form.os || ""} onChange={e => setForm(f => ({ ...f, os: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Company</div>
                          <input className="value" value={form.company || ""} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Location</div>
                          <input className="value" value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Date Purchased</div>
                          <input className="value" type="date" value={form.datePurchased || ""} onChange={e => setForm(f => ({ ...f, datePurchased: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Warranty Date</div>
                          <input className="value" type="date" value={form.warrantyDate || ""} onChange={e => setForm(f => ({ ...f, warrantyDate: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Purchase Amount (ZAR)</div>
                          <input className="value" type="number" step="0.01" value={form.purchaseAmount || ""} onChange={e => setForm(f => ({ ...f, purchaseAmount: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Owner</div>
                          <input className="value" value={form.owner || ""} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
                        </div>
                        <div className="field">
                          <div className="label">Status</div>
                          <input className="value" value={form.status || ""} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
                        </div>
                      </div>
                    </DetailsLayout>
                  );
                }