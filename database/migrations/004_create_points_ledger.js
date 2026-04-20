exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS points_ledger (
      id             SERIAL PRIMARY KEY,
      member_id      INTEGER      NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      points         INTEGER      NOT NULL,
      reason         VARCHAR(255) NOT NULL,
      type           VARCHAR(20)  NOT NULL
                       CHECK (type IN ('earned','spent','expired','bonus','adjusted')),
      reference_id   INTEGER,
      reference_type VARCHAR(20),
      expires_at     TIMESTAMP,
      created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS family_pool (
      id             SERIAL PRIMARY KEY,
      family_id      INTEGER NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
      points_balance INTEGER NOT NULL DEFAULT 0,
      updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS family_pool_ledger (
      id         SERIAL PRIMARY KEY,
      family_id  INTEGER      NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      points     INTEGER      NOT NULL,
      reason     VARCHAR(255) NOT NULL,
      type       VARCHAR(20)  NOT NULL CHECK (type IN ('bonus','spent','adjusted')),
      created_at TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  console.log('âœ… Created: points_ledger, family_pool, family_pool_ledger');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS family_pool_ledger');
  await db.query('DROP TABLE IF EXISTS family_pool');
  await db.query('DROP TABLE IF EXISTS points_ledger');
  console.log('í·‘  Dropped: points_ledger, family_pool, family_pool_ledger');
};
