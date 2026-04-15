// ===============================
// Update a single person
// ===============================
export async function updatePerson(id, payload) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/people/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const msg = await safeMessage(res);
        throw new Error(msg || `Failed to update person (${res.status})`);
    }
    return res.json();
}
const API = import.meta.env.VITE_API_BASE_URL;

// ===============================
// Fetch organisation list
// ===============================
export async function fetchOrgs({ search = "", page = 1, limit = 50 } = {}) {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    qs.set("page", String(page));
    qs.set("limit", String(limit));

    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg?${qs.toString()}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );

    if (!res.ok) {
        throw new Error(`Failed to load organisations (${res.status})`);
    }

    return res.json();
}

// ===============================
// Fetch single organisation
// ===============================
export async function fetchOrgById(id) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${id}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );

    if (!res.ok) {
        throw new Error(`Failed to load organisation (${res.status})`);
    }

    return res.json();
}

// ===============================
// Create organisation
// ===============================
export async function createOrg(payload) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const msg = await safeMessage(res);
        throw new Error(msg || `Failed to create organisation (${res.status})`);
    }

    return res.json();
}

// ===============================
// Update organisation
// ===============================
export async function updateOrg(id, payload) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const msg = await safeMessage(res);
        throw new Error(msg || `Failed to update organisation (${res.status})`);
    }

    return res.json();
}

// ===============================
// Fetch all people for an organisation
// ===============================
export async function fetchPeopleByOrg(orgId) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/people?orgId=${orgId}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );
    if (!res.ok) {
        throw new Error(`Failed to load people (${res.status})`);
    }
    return res.json();
}

// ===============================
// Create a single person (Crucial for CSV Import)
// ===============================
export async function createPerson(payload) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/people`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const msg = await safeMessage(res);
        throw new Error(msg || `Failed to create person (${res.status})`);
    }
    return res.json();
}

// ===============================
// Bulk create people
// ===============================
export async function bulkCreatePeople(people) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/people/bulk`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({ people }),
    });
    if (!res.ok) {
        const msg = await safeMessage(res);
        throw new Error(msg || `Failed to bulk create people (${res.status})`);
    }
    return res.json();
}

// ===============================
// Helpers
// ===============================
async function safeMessage(res) {
    try {
        const data = await res.json();
        return data?.message || "";
    } catch {
        return "";
    }
}