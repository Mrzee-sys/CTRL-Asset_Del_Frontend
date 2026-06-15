import React, { useEffect, useState } from "react";

export default function OrganizationSelector({ selectedOrgId, setSelectedOrgId, onOrgChange }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrgs() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/organisations");
        const data = await res.json();
        // Expecting array of orgs with _id and name
        if (!Array.isArray(data) || data.length === 0) {
          setOrgs([]);
          setError("No organizations found");
          console.log("Fetched organizations: 0");
          return;
        }
        // Defensive mapping for _id and name
        const mapped = data.map(org => ({
          _id: org._id || org.id || org.orgId || org.value,
          name: org.name || org.orgName || org.label || "Unnamed Org"
        }));
        setOrgs(mapped);
        console.log(`Fetched organizations: ${mapped.length}`);
      } catch (e) {
        setError("Failed to fetch organizations");
        setOrgs([]);
        console.log("Fetched organizations: 0 (error)");
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  // On mount, load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("activeOrgId");
    if (stored && stored !== selectedOrgId) {
      setSelectedOrgId(stored);
      if (onOrgChange) onOrgChange(stored);
    }
    // eslint-disable-next-line
  }, []);

  // On change, persist to localStorage and notify parent
  function handleChange(e) {
    const orgId = e.target.value;
    setSelectedOrgId(orgId);
    localStorage.setItem("activeOrgId", orgId);
    if (onOrgChange) onOrgChange(orgId);
  }

  return (
    <div className="org-selector" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor="org-dropdown" style={{ fontWeight: 500, color: "var(--text-color)" }}>Organisation:</label>
      <select
        id="org-dropdown"
        value={selectedOrgId || ""}
        onChange={handleChange}
        style={{
          boxSizing: "border-box",
          padding: "8px 12px",
          borderRadius: "var(--border-radius)",
          border: "1px solid var(--border-color)",
          background: "var(--input-bg)",
          color: "var(--text-color)",
          fontSize: "1rem"
        }}
      >
        <option value="" disabled>Select organisation...</option>
        {orgs.map(org => (
          <option key={org._id} value={org._id}>{org.name}</option>
        ))}
      </select>
      {loading && <span style={{ marginLeft: 12, color: "var(--muted-color)" }}>Loading...</span>}
      {error && <span style={{ marginLeft: 12, color: "var(--error-color)" }}>{error}</span>}
    </div>
  );
}
