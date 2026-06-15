import * as mongo from "./NetworkHardware.repository.mongo.js";
import * as sql from "./NetworkHardware.repository.sql.js";

const ACTIVE_DB =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_ACTIVE_DB) ||
	"mongo";

function repo() {
	if (ACTIVE_DB === "sql") return sql;
	return mongo;
}

export async function listNetworkHardware(params) {
	return repo().listNetworkHardware(params);
}

export async function createNetworkHardware(data) {
	return repo().createNetworkHardware(data);
}

export async function updateNetworkHardware(id, data) {
	return repo().updateNetworkHardware(id, data);
}

export async function getNetworkHardwareById(id) {
	return repo().getNetworkHardwareById(id);
}
