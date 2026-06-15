function notImplemented() {
	throw new Error("SQL AV equipment repository is not implemented yet.");
}

export async function listAvequipment() {
	return { rows: [], total: 0, page: 1, totalPages: 1 };
}

export async function createAvequipment() {
	return notImplemented();
}

export async function updateAvequipment() {
	return notImplemented();
}

export async function getAvequipmentById() {
	return notImplemented();
}