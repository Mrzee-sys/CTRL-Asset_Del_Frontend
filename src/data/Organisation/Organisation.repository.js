// Organisation.repository.js - The ESM Bridge
import * as mongoRepo from './Organisation.repository.mongo';
import * as sqlRepo from './Organisation.repository.sql';

// Vite handles environment variables differently than standard Node
const useSql = import.meta.env.VITE_USE_SQL === 'true';
const activeRepo = useSql ? sqlRepo : mongoRepo;

// Named exports that your Dashboard is looking for
export const findAll = activeRepo.findAll;
export const findById = activeRepo.findById;
export const create = activeRepo.create;
export const update = activeRepo.update;
export const remove = activeRepo.remove;

// Default export as a fallback
export default activeRepo;