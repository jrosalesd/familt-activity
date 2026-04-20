/**
 * Migration 006 â€” Create invites table
 *
 * WHAT YOU'RE LEARNING:
 *   This is the "token" pattern â€” used everywhere in real apps:
 *   password reset links, email verification, invite links.
 *   A random unguessable code is stored in the DB with an expiry.
 *   When someone uses the link, we look up the code, check it's
 *   not expired or already used, then take action.
 */
exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS invites (
      id          SERIAL PRIMARY KEY,
      family_id   INTEGER      NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      code        VARCHAR(20)  NOT NULL UNIQUE,
      role        VARCHAR(20)  NOT NULL DEFAULT 'child'
                    CHECK (role IN ('parent','trusted_adult','child')),
      created_by  INTEGER      NOT NULL REFERENCES members(id),

      -- NULL until someone uses it
      used_by     INTEGER      REFERENCES members(id),
      used_at     TIMESTAMP,

      expires_at  TIMESTAMP    NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);
  console.log('âœ… Created: invites');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS invites');
  console.log('í·‘  Dropped: invites');
};
