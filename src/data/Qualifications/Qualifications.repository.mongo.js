// Qualifications.repository.js (renamed internally for clarity)
// This is now an API wrapper for the SQL backend

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:5000";

const BASE_URL = `${API_BASE}/api/qualifications`;

function withCanonicalId(obj) {
  if (!obj || typeof obj !== "object") return obj;
  // Ensure we map both id and _id consistently
  const id = obj.id || obj._id || null;
  return { ...obj, id, _id: id };
}

export const mongoQualificationsRepository = {
  /**
   * GET /api/qualifications?personId=...
   */
  async list({ personId } = {}) {
    const url = new URL(BASE_URL);
    if (personId) url.searchParams.set("personId", String(personId)); // Ensure ID is a string
    
    const token = localStorage.getItem("token") || "";
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : undefined
      }
    });

    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(withCanonicalId) : [];
  },

  /**
   * POST /api/qualifications
   */
  async create(payload) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify(payload ?? {})
    });
    
    if (!res.ok) throw new Error(`Failed to create: ${res.status}`);
    const data = await res.json();
    return withCanonicalId(data);
  },

  /**
   * PUT /api/qualifications/:id
   */
  async update(id, payload) {
    if (!id) throw new Error("Qualification id is required");
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify(payload ?? {})
    });
    
    if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
    const data = await res.json();
    return withCanonicalId(data);
  },

  /**
   * DELETE /api/qualifications/:id
   */
  async remove(id) {
    if (!id) throw new Error("Qualification id is required");
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined
      }
    });
    return res.status === 204 || res.status === 200;
  }
};