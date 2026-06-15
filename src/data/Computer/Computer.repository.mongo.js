const API_BASE =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

const BASE_URL = `${API_BASE}/api/computers`;

function toQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") {
            search.set(key, String(value));
        }
    });
    const q = search.toString();
    return q ? `?${q}` : "";
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated. Please log in.');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

export const mongoComputerRepository = {
    async list(params = {}) {
        const res = await fetch(`${BASE_URL}${toQuery(params)}`, { headers: getAuthHeaders() });
        if (!res.ok) return { rows: [], total: 0 };
        const data = await res.json();
        return {
            rows: Array.isArray(data?.rows) ? data.rows : [],
            total: Number(data?.total || 0),
            page: Number(data?.page || 1),
            limit: Number(data?.limit || params.limit || 25),
            totalPages: Number(data?.totalPages || 1),
        };
    },
    async getById(id) {
        const res = await fetch(`${BASE_URL}/${id}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Computer not found");
        return res.json();
    },
    async create(data) {
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.message || "Failed to create computer");
        }
        return res.json();
    },
    async update(id, data) {
        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.message || "Failed to update computer");
        }
        return res.json();
    }
};
