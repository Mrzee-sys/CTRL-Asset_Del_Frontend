// src/pages/ComputerRegister/computerApi.js
//
// ? Updated: this file is now a thin adapter over the new data layer.
// - NO direct fetch / URLs / query params here anymore
// - The UI continues to import the same functions as before
// - Mongo vs SQL switching will happen inside the repository facade later

import {
    getComputerById as repoGetById,
    createComputer as repoCreate,
    updateComputer as repoUpdate,
    listComputers as repoList
} from "../../data/Computer/Computer.repository.js";

/**
 * LIST / SEARCH / PAGINATION
 * Keep the same signature your UI already uses.
 *
 * NOTE:
 * - The repository should return the SAME shape your UI expects:
 *   {
 *     rows: [],
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 */
export async function fetchComputers({ search = "", page = 1, limit = 50 } = {}) {
    return repoList({ search, page, limit });
}

/**
 * GET /computers/:id
 * Used for the Computer Asset Card page
 */
export async function fetchComputerById(id) {
    return repoGetById(id);
}

/**
 * CREATE
 */
export async function createComputer(payload) {
    return repoCreate(payload ?? {});
}

/**
 * UPDATE
 */
export async function updateComputer(id, payload) {
    return repoUpdate(id, payload ?? {});
}

/**
 * DELETE
 * Optional: remove an asset (or implement "Retire" later)
 */
export async function deleteComputer(id) {
    return repoDelete(id);
}