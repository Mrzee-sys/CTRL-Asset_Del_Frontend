import * as mongo from "./Docmanagement.repository.mongo.js";
import * as sql from "./Docmanagement.repository.sql.js";

const ACTIVE_DB =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_ACTIVE_DB) ||
	"mongo";

function repo() {
	if (ACTIVE_DB === "sql") return sql;
	return mongo;
}

export async function listDocuments(params) {
	return repo().listDocuments(params);
}

export async function getDocumentById(id) {
	return repo().getDocumentById(id);
}

export async function createDocument(data) {
	return repo().createDocument(data);
}

export async function updateDocument(id, data) {
	return repo().updateDocument(id, data);
}

export async function removeDocument(id) {
	return repo().removeDocument(id);
}