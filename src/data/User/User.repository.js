// User.repository.js
// Main repository interface for User data operations

const useSql = process.env.USE_SQL === 'true';

module.exports = useSql
  ? require('./User.repository.sql')
  : require('./User.repository.mongo');
