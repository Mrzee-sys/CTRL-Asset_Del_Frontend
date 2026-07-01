// Organisation.repository.mongo.js
// Frontend API wrapper for Organisations

export async function findAll() {
  const API_BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) || "http://localhost:5000";
  
  // 1. Grab the token from localStorage
  const token = localStorage.getItem("token") || "";

  const res = await fetch(`${API_BASE}/api/organisations`, {
    method: "GET",
    headers: { 
      "Accept": "application/json",
      // 2. Attach the token so the backend lets us in
      "Authorization": token ? `Bearer ${token}` : undefined
    }
  });

  if (!res.ok) {
    console.error(`Failed to fetch organisations: ${res.status}`);
    return [];
  }
  
  return await res.json();
}

export async function findById(id) {
  // Stub
}
export async function create(data) {
  // Stub
}
export async function update(id, data) {
  // Stub
}
export async function remove(id) {
  // Stub
}