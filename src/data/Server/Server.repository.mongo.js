function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated. Please log in.');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function toQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') {
            search.set(key, String(value));
        }
    });
    const q = search.toString();
    return q ? `?${q}` : '';
}

const API_BASE =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

const BASE_URL = `${API_BASE}/api/servers`;

export const listServers = async (params = {}) => {
    const query = { ...params, limit: params.limit ?? 1000 };
    const res = await fetch(`${BASE_URL}${toQuery(query)}`, { headers: getAuthHeaders() });
    if (!res.ok) return { rows: [], total: 0, page: 1, totalPages: 1 };
    const data = await res.json();
    return {
        rows: Array.isArray(data?.rows) ? data.rows : [],
        total: Number(data?.total || 0),
        page: Number(data?.page || 1),
        totalPages: Number(data?.totalPages || 1),
    };
};

export const createServer = async (data) => {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        let message = "Failed to create server";
        try {
            const err = await res.json();
            message = err?.message || message;
        } catch {
            const text = await res.text();
            if (text) message = text;
        }
        throw new Error(message);
    }
    return res.json();
};

export const updateServer = async (id, data) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        let message = "Failed to update server";
        try {
            const err = await res.json();
            message = err?.message || message;
        } catch {
            const text = await res.text();
            if (text) message = text;
        }
        throw new Error(message);
    }
    return res.json();
};

export const getServerById = async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Server not found");
    return res.json();
};