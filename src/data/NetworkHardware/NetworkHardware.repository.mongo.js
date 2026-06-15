// Mongo implementation for NetworkHardware
function getAuthHeaders() {
	const token = localStorage.getItem('token');
	if (!token) throw new Error('Not authenticated. Please log in.');
	return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

const API_BASE =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_API_BASE) ||
	"http://localhost:5000";

const BASE_URL = `${API_BASE}/api/network-hardware`;

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

export const listNetworkHardware = async (params = {}) => {
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
export const createNetworkHardware = async (data) => {
	const res = await fetch(BASE_URL, {
		method: "POST",
		headers: getAuthHeaders(),
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || "Failed to create network hardware");
	}
	return res.json();
};
export const updateNetworkHardware = async (id, data) => {
	const res = await fetch(`${BASE_URL}/${id}`, {
		method: "PUT",
		headers: getAuthHeaders(),
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const message = await res.text();
		throw new Error(message || "Failed to update network hardware");
	}
	return res.json();
};
export const getNetworkHardwareById = async (id) => {
	const res = await fetch(`${BASE_URL}/${id}`, { headers: getAuthHeaders() });
	if (!res.ok) throw new Error("Network hardware not found");
	return res.json();
};