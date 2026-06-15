import { mongoComputerRepository } from "./Computer.repository.mongo.js";
import { sqlComputerRepository } from "./Computer.repository.sql.js";

const ACTIVE_DB =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_ACTIVE_DB) ||
    "mongo";

function repo() {
    if (ACTIVE_DB === "sql") return sqlComputerRepository;
    return mongoComputerRepository;
}

export async function listComputers(params) {
    return repo().list(params);
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
