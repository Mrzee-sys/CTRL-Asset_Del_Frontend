// src/data/People/People.Repository.js
// ---------------------------------------------------------
// Database-agnostic facade for People operations.
// ---------------------------------------------------------

import { mongoPersonRepository } from "./person.repository.mongo";
import { sqlPersonRepository } from "./People.repository.sql";

const ACTIVE_DB =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_ACTIVE_DB) ||
    "mongo";

const repo = ACTIVE_DB === "sql" ? sqlPersonRepository : mongoPersonRepository;

// Helper: flatten address object to flat fields
function flattenAddress(person) {
    if (!person?.address) return person;
    const { address, ...rest } = person;
    const flat = { ...rest };
    if (address) {
        Object.entries(address).forEach(([k, v]) => {
            flat["address" + k.charAt(0).toUpperCase() + k.slice(1)] = v;
        });
    }
    return flat;
}

// Helper: inflate flat fields to address object
function inflateAddress(person) {
    if (!person) return person;
    const addressKeys = ["addressLine1", "complexName", "city", "state", "postalCode", "country"];
    const address = {};
    let hasAddress = false;
    addressKeys.forEach(k => {
        const flatKey = "address" + k.charAt(0).toUpperCase() + k.slice(1);
        if (person[flatKey] !== undefined) {
            address[k] = person[flatKey];
            hasAddress = true;
        }
    });
    if (hasAddress) {
        return { ...person, address };
    }
    return person;
}

// ---------------------------------------------------------
// Public API (These names match your Peoplecards.jsx imports)
// ---------------------------------------------------------

export async function listPeople(params = {}) {
    const result = await repo.list(params);
    // If paged result
    if (result?.rows) {
        return { ...result, rows: result.rows.map(inflateAddress) };
    }
    // If array
    if (Array.isArray(result)) {
        return result.map(inflateAddress);
    }
    return result;
}

export async function getPersonById(id) {
    const person = await repo.getById(id);
    return inflateAddress(person);
}

export async function createPerson(data) {
    return repo.create(flattenAddress(data));
}

export async function updatePerson(id, data) {
    return repo.update(id, flattenAddress(data));
}

export async function deletePerson(id) {
    return repo.remove(id);
}