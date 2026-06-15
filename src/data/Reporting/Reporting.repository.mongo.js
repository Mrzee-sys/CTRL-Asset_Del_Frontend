export async function listReports() {
	return { rows: [], total: 0, page: 1, totalPages: 1 };
}

export async function getReportById() {
	throw new Error("Mongo Reporting repository is not implemented yet.");
}

export async function createReport() {
	throw new Error("Mongo Reporting repository is not implemented yet.");
}

export async function updateReport() {
	throw new Error("Mongo Reporting repository is not implemented yet.");
}

export async function removeReport() {
	throw new Error("Mongo Reporting repository is not implemented yet.");
}