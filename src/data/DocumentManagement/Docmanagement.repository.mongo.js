export async function listDocuments() {
	return { rows: [], total: 0, page: 1, totalPages: 1 };
}

export async function getDocumentById() {
	throw new Error("Mongo DocumentManagement repository is not implemented yet.");
}

export async function createDocument() {
	throw new Error("Mongo DocumentManagement repository is not implemented yet.");
}

export async function updateDocument() {
	throw new Error("Mongo DocumentManagement repository is not implemented yet.");
}

export async function removeDocument() {
	throw new Error("Mongo DocumentManagement repository is not implemented yet.");
}