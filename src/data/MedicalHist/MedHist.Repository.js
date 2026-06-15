// src/data/MedicalHist/MedHist.Repository.js
// Frontend repository: calls backend /api/medhist endpoints.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Build authorization headers from localStorage token.
 */
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch all medical history records for an employee.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
export async function getMedicalHistory(employeeId) {
  const res = await fetch(`${BASE_URL}/api/medhist?employeeId=${encodeURIComponent(employeeId)}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to fetch medical history');
  }
  return res.json();
}

/**
 * Create a new medical history record.
 * @param {object} data – { employee_id, last_medical_date, medical_type, expiry_date, fitness_status }
 * @returns {Promise<object>}
 */
export async function createMedicalRecord(data) {
  const res = await fetch(`${BASE_URL}/api/medhist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to create medical record');
  }
  return res.json();
}
