/**
 * Migration 007 â€” Create sessions table
 *
 * connect-pg-simple expects this exact structure.
 * We create it manually in our schema instead of relying
 * on createTableIfMissing which defaults to public schema.
 */
exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid    VARCHAR      NOT NULL PRIMARY KEY,
      sess   JSON         NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_expire_idx
      ON sessions (expire);
  `);
  console.log('âœ… Created: sessions');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS sessions');
  console.log('í·‘  Dropped: sessions');
};
