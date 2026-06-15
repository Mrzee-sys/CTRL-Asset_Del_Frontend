import * as mongo from "./Server.repository.mongo.js";
import * as sql from "./Server.repository.sql.js";

const ACTIVE_DB =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_ACTIVE_DB) ||
	"mongo";

function repo() {
	if (ACTIVE_DB === "sql") return sql;
	return mongo;
}

export async function listServers(params) {
	return repo().listServers(params);
}

export async function createServer(data) {
	return repo().createServer(data);
}

export async function updateServer(id, data) {
	return repo().updateServer(id, data);
}

export async function getServerById(id) {
	return repo().getServerById(id);
}