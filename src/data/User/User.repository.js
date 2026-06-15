import * as mongo from "./User.repository.mongo.js";
import * as sql from "./User.repository.sql.js";

const ACTIVE_DB =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_ACTIVE_DB) ||
  "mongo";

function repo() {
  if (ACTIVE_DB === "sql") return sql;
  return mongo;
}

export async function findAll(params) {
  return repo().findAll(params);
}

export async function findById(id) {
  return repo().findById(id);
}

export async function create(data) {
  return repo().create(data);
}

export async function update(id, data) {
  return repo().update(id, data);
}

export async function remove(id) {
  return repo().remove(id);
}

export default {
  findAll,
  findById,
  create,
  update,
  remove,
};
