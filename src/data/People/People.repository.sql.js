export const sqlPersonRepository = {
  async list() {
    return { rows: [], page: 1, limit: 50, total: 0, totalPages: 1 };
  },
  async getById() {
    throw new Error("SQL People repository is not implemented yet.");
  },
  async create() {
    throw new Error("SQL People repository is not implemented yet.");
  },
  async update() {
    throw new Error("SQL People repository is not implemented yet.");
  },
  async remove() {
    throw new Error("SQL People repository is not implemented yet.");
  },
};
