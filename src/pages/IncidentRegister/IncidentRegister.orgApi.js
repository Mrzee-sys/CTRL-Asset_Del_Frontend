// Helper to fetch org details (logo, name, etc) for IncidentCard
const API = import.meta.env.VITE_API_BASE_URL;

export async function fetchOrgDetails(orgId) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${orgId}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );
    if (!res.ok) throw new Error("Failed to load organisation");
    return await res.json();
}
