exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS families (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      created_at TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS members (
      id            SERIAL PRIMARY KEY,
      family_id     INTEGER      NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(150),
      password_hash VARCHAR(255),
      pin           CHAR(4),
      avatar_color  VARCHAR(7)   NOT NULL DEFAULT '#6f4e37',
      role          VARCHAR(20)  NOT NULL DEFAULT 'child'
                      CHECK (role IN ('parent','trusted_adult','child')),
      is_temporary  BOOLEAN      NOT NULL DEFAULT false,
      expires_at    TIMESTAMP,
      points_balance INTEGER     NOT NULL DEFAULT 0,
      is_active     BOOLEAN      NOT NULL DEFAULT true,
      created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  console.log('âœ… Created: families, members');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS members');
  await db.query('DROP TABLE IF EXISTS families');
  console.log('í·‘  Dropped: families, members');
};
