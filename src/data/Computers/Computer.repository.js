// src/data/Computers/computer.repository.js
//
// Database-agnostic facade for Computers.
// UI (or computerApi.js adapter) imports ONLY from here.
//
// Today: hard-wired to Mongo repo.
// Later: Settings page can flip ACTIVE_DB without touching UI.

import { mongoComputerRepository } from "./computer.repository.mongo";
import { sqlComputerRepository } from "./computer.repository.sql";

// TEMP: until Settings page exists

const ACTIVE_DB =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_ACTIVE_DB) ||
    "mongo";


function repo() {
    if (ACTIVE_DB === "sql") return sqlComputerRepository;
    return mongoComputerRepository;
}

// ---------------------------------------------------------
// Public API (keep names stable)
// ---------------------------------------------------------

/**
 * List computers with same paging shape your UI expects:
 * {
 *   rows: [],
 *   page: number,
 *   limit: number,
 *   total: number,
 *   totalPages: number
 * }
 */
export async function listComputers({ search = "", page = 1, limit = 50 } = {}) {
    return repo().list({ search, page, limit });
}

export async function getComputerById(id) {
    return repo().getById(id);
}

export async function createComputer(data) {
    return repo().create(data);
}

export async function updateComputer(id, data) {
    return repo().update(id, data);
}

export async function deleteComputer(id) {
    return repo().remove(id);
}
