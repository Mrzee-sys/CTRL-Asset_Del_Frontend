console.log("Hello World!")// src/data/Servers/server.repository.mongo.js

const API_BASE = "http://localhost:5000"; // Ensure this matches your backend port
const BASE_URL = `${API_BASE}/api/servers`;

export const mongoServerRepository = {
    async list(params = {}) {
        const res = await fetch(BASE_URL);
        if (!res.ok) return { rows: [], total: 0 };
        const data = await res.json();
        return { rows: data, total: data.length };
    },

    async getById(id) {
        const res = await fetch(`${BASE_URL}/${id}`);
        if (!res.ok) throw new Error("Server not found");
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
    },

    async remove(id) {
        await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    }
};