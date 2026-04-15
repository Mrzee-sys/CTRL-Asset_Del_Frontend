import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
// ✅ Path corrected: Climbing up two levels to reach src/Templates
import DetailsLayout from "../DetailsLayout";
// ✅ Path corrected: Matching the capital 'S' in your file name
import { mongoServerRepository } from "../../data/Servers/Servers.repository";

const fmt = { text: (v) => v ?? "" };

const initialForm = {
  hostname: "",
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
  ipAddress: "",
  cpu: "",
  ram: "",
  rackPosition: "",
  isVirtual: false,
};

export default function ServerCard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = id === "new";

  const [form, setForm] = useState(initialForm);
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isCreate) {
      setLoading(true);
      mongoServerRepository.getById(id)
        .then((data) => {
          setServer(data);
          setForm({ ...initialForm, ...data });
        })
        .catch(() => setError("Failed to load server details. Please check the API."))
        .finally(() => setLoading(false));
    }
  }, [id, isCreate]);

  const onSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (isCreate) {
        await mongoServerRepository.create(form);
      } else {
        await mongoServerRepository.update(id, form);
      }
      navigate("/computers");
    } catch (e) {
      setError("Failed to save server record. Ensure the backend is running.");
    } finally {
      setSaving(false);
    }
  };

  const sidebarContent = (
    <>
      <div className="panel__title">Quick Summary</div>
      <div className="sideBlocks">
        <div className="sideBlock">
          <div className="sideBlock__title">Status & Metadata</div>
          <div className="summary">
            <div className="summaryRow">
              <div className="summaryLabel">Status</div>
              <div className="summaryValue">
                <span className={`pill ${form.status ? "status-" + form.status.toLowerCase() : ""}`}>
                  {form.status || "Unknown"}
                </span>
              </div>
            </div>
            <div className="summaryRow">
              <div className="summaryLabel">Hostname</div>
              <div className="summaryValue">{form.hostname || "—"}</div>
            </div>
            <div className="summaryRow">
              <div className="summaryLabel">Make</div>
              <div className="summaryValue">{form.make || "—"}</div>
            </div>
            <div className="summaryRow">
              <div className="summaryLabel">Model</div>
              <div className="summaryValue">{form.model || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="actionBlock" style={{ marginTop: 24 }}>
        <div className="actionBlock__buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btnPrimary" type="button" onClick={onSave} disabled={saving}>
            {saving ? "Processing..." : "Save Server"}
          </button>
          <button className="btn" type="button" onClick={() => navigate("/computers")} disabled={saving} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );

  if (loading) return <div style={{ padding: '40px', color: '#fff' }}>Gathering Infrastructure Data...</div>;
  if (error) return <div className="error" style={{ padding: '40px' }}>{error}</div>;

  return (
    <DetailsLayout
      title={isCreate ? "New Server Asset" : fmt.text(server?.hostname)}
      subtitle={isCreate ? "Manual entry for data center hardware" : `Infrastructure Asset • Internal ID: ${fmt.text(server?._id)}`}
      statusPills={isCreate ? [] : [{ text: fmt.text(server?.status), className: form.status ? "status-" + form.status.toLowerCase() : "" }]}
      sidebarContent={sidebarContent}
    >
      <div className="panel__title">General Information</div>
      <div className="fieldGrid">
        <div className="field">
          <div className="label">Hostname</div>
          <input className="value" value={form.hostname || ""} onChange={e => setForm(f => ({ ...f, hostname: e.target.value }))} placeholder="SVR-PROD-01" />
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
          <div className="label">Server OS</div>
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
          <div className="label">Owner / Dept</div>
          <input className="value" value={form.owner || ""} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
        </div>
        <div className="field">
          <div className="label">Status</div>
          <input className="value" value={form.status || ""} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
        </div>

        {/* ✅ Section Header: Spans Full Width */}
        <div className="field" style={{ gridColumn: "1 / -1", marginTop: "32px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px" }}>
            <div className="panel__title" style={{ margin: 0 }}>Server Specifications</div>
        </div>

        <div className="field">
          <div className="label">IP Address</div>
          <input className="value" value={form.ipAddress || ""} onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.1" />
        </div>
        <div className="field">
          <div className="label">CPU Type / Speed</div>
          <input className="value" value={form.cpu || ""} onChange={e => setForm(f => ({ ...f, cpu: e.target.value }))} />
        </div>
        <div className="field">
          <div className="label">RAM (GB)</div>
          <input className="value" value={form.ram || ""} onChange={e => setForm(f => ({ ...f, ram: e.target.value }))} />
        </div>
        <div className="field">
          <div className="label">Rack Position</div>
          <input className="value" value={form.rackPosition || ""} onChange={e => setForm(f => ({ ...f, rackPosition: e.target.value }))} />
        </div>
        
        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
          <input 
            type="checkbox" 
            id="isVirtualCheck"
            checked={!!form.isVirtual} 
            onChange={e => setForm(f => ({ ...f, isVirtual: e.target.checked }))} 
          />
          <label htmlFor="isVirtualCheck" className="label" style={{ marginBottom: 0, cursor: 'pointer' }}>Virtual Server Instance</label>
        </div>
      </div>
    </DetailsLayout>
  );
}