import * as mongo from "./Reporting.repository.mongo.js";
import * as sql from "./Reporting.repository.sql.js";

const ACTIVE_DB =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_ACTIVE_DB) ||
	"mongo";

function repo() {
	if (ACTIVE_DB === "sql") return sql;
	return mongo;
}

export async function listReports(params) {
	return repo().listReports(params);
}

export async function getReportById(id) {
	return repo().getReportById(id);
}

export async function createReport(data) {
	return repo().createReport(data);
}

export async function updateReport(id, data) {
	return repo().updateReport(id, data);
}

export async function removeReport(id) {
	return repo().removeReport(id);
}