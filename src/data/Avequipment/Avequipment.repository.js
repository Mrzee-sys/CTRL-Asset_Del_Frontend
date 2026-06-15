import * as mongo from "./Avequipment.repository.mongo.js";
import * as sql from "./Avequipment.repository.sql.js";

const ACTIVE_DB =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_ACTIVE_DB) ||
	"mongo";

function repo() {
	if (ACTIVE_DB === "sql") return sql;
	return mongo;
}

export async function listAvequipment(params) {
	return repo().listAvequipment(params);
}

export async function createAvequipment(data) {
	return repo().createAvequipment(data);
}

export async function updateAvequipment(id, data) {
	return repo().updateAvequipment(id, data);
}

export async function getAvequipmentById(id) {
	return repo().getAvequipmentById(id);
}
