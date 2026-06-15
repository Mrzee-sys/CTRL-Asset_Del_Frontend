function notImplemented() {
	throw new Error("SQL NetworkHardware repository is not implemented yet.");
}

export async function listNetworkHardware() {
	return { rows: [], total: 0, page: 1, totalPages: 1 };
}

export async function createNetworkHardware() {
	return notImplemented();
}

export async function updateNetworkHardware() {
	return notImplemented();
}

export async function getNetworkHardwareById() {
	return notImplemented();
}