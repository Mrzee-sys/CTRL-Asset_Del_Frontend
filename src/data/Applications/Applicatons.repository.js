import * as mongo from "./Applications.repository.mongo.js";
import * as sql from "./Applications.repository.sql.js";

const ACTIVE_DB =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_ACTIVE_DB) ||
	"mongo";

function repo() {
	if (ACTIVE_DB === "sql") return sql;
	return mongo;
}

export async function listApplications(params) {
	return repo().listApplications(params);
}

export async function getApplicationById(id) {
	return repo().getApplicationById(id);
}

export async function createApplication(data) {
	return repo().createApplication(data);
}

export async function updateApplication(id, data) {
	return repo().updateApplication(id, data);
}

export async function removeApplication(id) {
	return repo().removeApplication(id);
}