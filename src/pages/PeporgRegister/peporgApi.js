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
// Fetch single organisation (The Edit Screen fix)
// ===============================
export async function fetchOrgById(id) {
    // 1. Prevent 400 errors when navigating to a new org or empty ID
    if (!id || id === "new") return null; 
    
    // 2. THE MAGIC FIX: Strip the invisible spaces!
    const cleanId = String(id).trim();

    // Requesting from: http://localhost:5000/api/peporg/:cleanId
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${cleanId}`,
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
    if (!id) throw new Error("No ID provided for update");
    
    // Safety trim for updates too!
    const cleanId = String(id).trim();

    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/peporg/${cleanId}`, {
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
// Create a single person
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
// Fetch person by email
// ===============================
export async function fetchPersonByEmail(email) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${API}/people/email/${encodeURIComponent(email)}`,
        {
            headers: {
                Authorization: token ? `Bearer ${token}` : undefined
            }
        }
    );
    if (!res.ok) {
        throw new Error(`Failed to load person (${res.status})`);
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