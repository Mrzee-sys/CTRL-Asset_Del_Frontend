const API_BASE =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

const BASE_URL = `${API_BASE}/api/sql/computers`;

export const sqlComputerRepository = {
    async list(params = {}) {
        const res = await fetch(BASE_URL);
        if (!res.ok) return { rows: [], total: 0 };
        const data = await res.json();
        return { rows: data, total: data.length };
    },
    async getById(id) {
        const res = await fetch(`${BASE_URL}/${id}`);
        if (!res.ok) throw new Error("Computer not found");
        return res.json();
    },
    async create(data) {
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async update(id, data) {
        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.json();
    }
};
