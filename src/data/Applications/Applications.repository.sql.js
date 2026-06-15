export async function listApplications() {
	return { rows: [], total: 0, page: 1, totalPages: 1 };
}

export async function getApplicationById() {
	throw new Error("SQL Applications repository is not implemented yet.");
}

export async function createApplication() {
	throw new Error("SQL Applications repository is not implemented yet.");
}

export async function updateApplication() {
	throw new Error("SQL Applications repository is not implemented yet.");
}

export async function removeApplication() {
	throw new Error("SQL Applications repository is not implemented yet.");
}