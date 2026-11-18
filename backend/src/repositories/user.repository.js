const COLUMNS = 'id, email, full_name, created_at, updated_at';

function toUser(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.password_hash) user.passwordHash = row.password_hash;
  return user;
}

export default function createUserRepository(db) {
  return {
    async findById(id, client = db) {
      const { rows } = await client.query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
      return toUser(rows[0]);
    },

    // Includes passwordHash, for login only.
    async findByEmail(email, client = db) {
      const { rows } = await client.query(
        `SELECT ${COLUMNS}, password_hash FROM users WHERE email = $1`,
        [email],
      );
      return toUser(rows[0]);
    },

    async create({ email, passwordHash, fullName }, client = db) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING ${COLUMNS}`,
        [email, passwordHash, fullName],
      );
      return toUser(rows[0]);
    },
  };
}
