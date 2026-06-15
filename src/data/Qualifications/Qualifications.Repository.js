import { mongoQualificationsRepository } from "./Qualifications.repository.mongo";
import { sqlQualificationsRepository } from "./Qualifications.repository.sql";

const ACTIVE_DB =
	(typeof import.meta !== "undefined" &&
		import.meta.env &&
		import.meta.env.VITE_ACTIVE_DB) ||
	"mongo";

const repo = ACTIVE_DB === "sql" ? sqlQualificationsRepository : mongoQualificationsRepository;

// ✅ Keep these for long-form use
export async function listQualifications(params = {}) { return repo.list(params); }
export async function createQualification(data) { return repo.create(data); }
export async function updateQualification(id, data) { return repo.update(id, data); }
export async function deleteQualification(id) { return repo.remove(id); }

// ✅ ADD THESE ALIASES so Home.jsx (and others) can use the short versions
export const listQuals = listQualifications;
export const createQual = createQualification;
export const updateQual = updateQualification;
export const deleteQual = deleteQualification;