// Fetch a single incident by orgId and incidentId
export async function fetchIncidentById(orgId, incidentId) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${orgId}/incident/${incidentId}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );
    if (!res.ok) throw new Error("Failed to fetch incident");
    const data = await res.json();
    return data.incident;
}
// API for incident management
const API = import.meta.env.VITE_API_BASE_URL;

export async function fetchOrgPeople(orgId) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${orgId}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );
    if (!res.ok) throw new Error("Failed to load organisation");
    const data = await res.json();
    return Array.isArray(data.people) ? data.people : [];
}

export async function saveIncident(orgId, email, incident) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${orgId}/incident`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({ email, ...incident })
    });
    if (!res.ok) throw new Error("Failed to save incident");
    return res.json();
}

// Fetch all incidents for a user (by email) in an organisation
export async function fetchUserIncidents(orgId, email) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${orgId}/incidents?email=${encodeURIComponent(email)}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );
    if (!res.ok) throw new Error("Failed to fetch incidents");
    const data = await res.json();
    return data.incidents || [];
}
