// src/data/Computers/computer.repository.sql.js
//
// SQL implementation (FRONTEND) talks to BACKEND endpoints that use `mssql`.
// IMPORTANT: Do NOT put SQL connection strings or mssql here.

const API_BASE =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

const BASE_URL = `${API_BASE}/api/sql`; // 👈 SQL endpoints namespace

async function handleResponse(res) {
    if (!res.ok) {
        try {
            const data = await res.json();
            const msg =
                data?.message ||
                data?.error ||
                (typeof data === "string" ? data : null);
            throw new Error(msg || `Request failed with status ${res.status}`);
        } catch {
            const text = await res.text().catch(() => "");
            throw new Error(text || `Request failed with status ${res.status}`);
        }
    }
    if (res.status === 204) return null;
    return res.json();
}

function withCanonicalId(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const id = obj.id || obj._id || obj.openId || null;
    return { ...obj, id };
}

function mapPagedResult(paged) {
    const rows = Array.isArray(paged?.rows) ? paged.rows.map(withCanonicalId) : [];
    return {
        rows,
        page: Number(paged?.page ?? 1),
        limit: Number(paged?.limit ?? rows.length),
        total: Number(paged?.total ?? rows.length),
        totalPages: Number(paged?.totalPages ?? 1)
    };
}

export const sqlComputerRepository = {
    async list({ search = "", page = 1, limit = 50 } = {}) {
        const url = new URL(`${BASE_URL}/computers`);

        if (search && String(search).trim() !== "") {
            url.searchParams.set("search", String(search).trim());
        }

        const safePage = Number.isFinite(Number(page)) ? Math.max(parseInt(page, 10), 1) : 1;
        const safeLimit = Number.isFinite(Number(limit))
            ? Math.min(Math.max(parseInt(limit, 10), 1), 200)
            : 50;

        url.searchParams.set("page", String(safePage));
        url.searchParams.set("limit", String(safeLimit));

        const res = await fetch(url.toString(), {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        const data = await handleResponse(res);
        return mapPagedResult(data);
    },

    async getById(id) {
        if (!id) throw new Error("Computer id is required");

        const res = await fetch(`${BASE_URL}/computers/${id}`, {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        const data = await handleResponse(res);
        return withCanonicalId(data);
    },

    async create(payload) {
        const res = await fetch(`${BASE_URL}/computers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(payload ?? {})
        });

        const data = await handleResponse(res);
        return withCanonicalId(data);
    },

    async update(id, payload) {
        if (!id) throw new Error("Computer id is required");

        const res = await fetch(`${BASE_URL}/computers/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(payload ?? {})
        });

        const data = await handleResponse(res);
        return withCanonicalId(data);
    },

    async remove(id) {
        if (!id) throw new Error("Computer id is required");

        const res = await fetch(`${BASE_URL}/computers/${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json" }
        });

        return handleResponse(res);
    }
};