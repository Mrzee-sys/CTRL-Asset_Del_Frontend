function notImplemented() {
	throw new Error("SQL Server repository is not implemented yet.");
}

export async function listServers() {
	return { rows: [], total: 0, page: 1, totalPages: 1 };
}

export async function createServer() {
	return notImplemented();
}

export async function updateServer() {
	return notImplemented();
}

export async function getServerById() {
	return notImplemented();
}