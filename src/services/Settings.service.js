const API_BASE =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE) ||
    "http://localhost:5000";

const BASE_URL = `${API_BASE}/api/settings`;

function getAuthHeaders() {
    const token = localStorage.getItem("token") || "";
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.message || "Settings request failed");
    }
    return data;
}

export async function getSqlMode() {
    const res = await fetch(`${BASE_URL}/sql-mode`, {
        headers: getAuthHeaders(),
    });
    return parseJson(res);
}

export async function setSqlMode(useSql) {
    const res = await fetch(`${BASE_URL}/sql-mode`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled: Boolean(useSql) }),
    });
    return parseJson(res);
}

export async function getSqlBundle() {
    const res = await fetch(`${BASE_URL}/sql-bundle`, {
        headers: getAuthHeaders(),
    });
    return parseJson(res);
}

export async function downloadSqlReadme() {
    const res = await fetch(`${BASE_URL}/sql-readme?download=1`, {
        headers: { Authorization: getAuthHeaders().Authorization },
    });
    if (!res.ok) throw new Error("Failed to download SQL README");
    return res.blob();
}

export async function downloadSqlSchema() {
    const res = await fetch(`${BASE_URL}/sql-schema?download=1`, {
        headers: { Authorization: getAuthHeaders().Authorization },
    });
    if (!res.ok) throw new Error("Failed to download SQL schema");
    return res.blob();
}
