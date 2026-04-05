const API = import.meta.env.VITE_API_BASE_URL;

// ===============================
// Fetch organisation list
// ===============================
export async function fetchOrgs({ search = "", page = 1, limit = 50 } = {}) {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    qs.set("page", String(page));
    qs.set("limit", String(limit));

    const res = await fetch(`${API}/api/peporg?${qs.toString()}`);

    if (!res.ok) {
        throw new Error(`Failed to load organisations (${res.status})`);
    }

    return res.json();
}

// ===============================
// Fetch single organisation
// ===============================
export async function fetchOrgById(id) {
    const res = await fetch(`${API}/api/peporg/${id}`);

    if (!res.ok) {
        throw new Error(`Failed to load organisation (${res.status})`);
    }

    return res.json();
}

// ===============================
// Create organisation
// ===============================
export async function createOrg(payload) {
    const res = await fetch(`${API}/api/peporg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${API}/api/peporg/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const msg = await safeMessage(res);
        throw new Error(msg || `Failed to update organisation (${res.status})`);
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