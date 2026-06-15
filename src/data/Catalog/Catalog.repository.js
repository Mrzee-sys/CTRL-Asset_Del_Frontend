const API_BASE =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

const BASE_URL = `${API_BASE}/api/catalog`;

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated. Please log in.");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

function toQuery(params) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") {
            search.set(key, String(value));
        }
    });
    const q = search.toString();
    return q ? `?${q}` : "";
}

export async function getCatalogItems(type, filter = {}) {
    const params =
        typeof filter === "string"
            ? { query: filter }
            : (filter || {});

    const res = await fetch(
        `${BASE_URL}${toQuery({ type, ...params })}`,
        { headers: getAuthHeaders() }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.rows) ? data.rows : [];
}

export async function addCatalogItem(type, value, parent = "") {
    const cleanValue = String(value || "").trim();
    const cleanParent = String(parent || "").trim();
    if (!cleanValue) return null;

    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ type, value: cleanValue, parent: cleanParent }),
    });

    if (!res.ok) {
        let msg = "Failed to add catalog item";
        try {
            const err = await res.json();
            if (err?.message) msg = err.message;
        } catch {
            // ignore parse failure
        }
        throw new Error(msg);
    }

    return res.json();
}
