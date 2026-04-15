// Ensures flat structure and correct types for new fields
function preparePayload(person) {
    return {
        ...person,
        gender: typeof person.gender === 'string' ? person.gender : '',
        age: person.age !== undefined && person.age !== null && person.age !== '' ? Number(person.age) : undefined,
        contactNumber: typeof person.contactNumber === 'string' ? person.contactNumber : '',
        classification: typeof person.classification === 'string' ? person.classification : '',
    };
}
// src/data/People/person.repository.mongo.js
// Mongo implementation for People repository.
// Supports both id and _id for compatibility with existing UI.

const API_BASE =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

const BASE_URL = `${API_BASE}/api`;

/**
 * Standard response handler for the API.
 */
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

/**
 * Normalizes IDs so the UI always has access to 'id' regardless of DB source.
 */
function withCanonicalId(obj) {
    if (!obj || typeof obj !== "object") return obj;
    const id = obj.id || obj._id || obj.openId || null;
    return { ...obj, id, _id: obj._id || id };
}

/**
 * Maps the backend response to a standard shape.
 * Fixes the "No people registered" bug by handling raw arrays AND paged objects.
 */
function mapPagedResult(paged) {
    // If 'paged' is a raw array, use it directly as rows. 
    // Otherwise, look for the 'rows' property.
    const rawRows = Array.isArray(paged) ? paged : (paged?.rows || []);
    
    // Map each row to include canonical IDs
    const rows = rawRows.map(withCanonicalId);

    return {
        rows,
        page: Number(paged?.page ?? 1),
        limit: Number(paged?.limit ?? rows.length),
        total: Number(paged?.total ?? rows.length),
        totalPages: Number(paged?.totalPages ?? 1)
    };
}

export const mongoPersonRepository = {
    /**
     * GET /api/people?search=&page=&limit=&orgId=
     */
    async list({ search = "", page = 1, limit = 50, orgId } = {}) {
        const url = new URL(`${BASE_URL}/people`);
        
        if (search && String(search).trim() !== "") {
            url.searchParams.set("search", String(search).trim());
        }
        
        if (orgId) {
            url.searchParams.set("orgId", orgId);
        }

        const safePage = Number.isFinite(Number(page)) ? Math.max(parseInt(page, 10), 1) : 1;
        const safeLimit = Number.isFinite(Number(limit))
            ? Math.min(Math.max(parseInt(limit, 10), 1), 200)
            : 50;

        url.searchParams.set("page", String(safePage));
        url.searchParams.set("limit", String(safeLimit));

        const token = localStorage.getItem("token") || "";
        const res = await fetch(url.toString(), {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: token ? `Bearer ${token}` : undefined
            }
        });

        const data = await handleResponse(res);
        return mapPagedResult(data);
    },

    /**
     * GET /api/people/:id
     */
    async getById(id) {
        if (!id) throw new Error("Person id is required");
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${BASE_URL}/people/${id}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: token ? `Bearer ${token}` : undefined
            }
        });
        const data = await handleResponse(res);
        return withCanonicalId(data);
    },

    /**
     * POST /api/people
     */
    async create(payload) {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${BASE_URL}/people`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: token ? `Bearer ${token}` : undefined
            },
            body: JSON.stringify(preparePayload(payload) ?? {})
        });
        const data = await handleResponse(res);
        return withCanonicalId(data);
    },

    /**
     * PUT /api/people/:id
     */
    async update(id, payload) {
        if (!id) throw new Error("Person id is required");
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${BASE_URL}/people/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: token ? `Bearer ${token}` : undefined
            },
            body: JSON.stringify(preparePayload(payload) ?? {})
        });
        const data = await handleResponse(res);
        return withCanonicalId(data);
    },

    /**
     * DELETE /api/people/:id
     */
    async remove(id) {
        if (!id) throw new Error("Person id is required");
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${BASE_URL}/people/${id}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                Authorization: token ? `Bearer ${token}` : undefined
            }
        });
        return handleResponse(res);
    }
};