/**
 * Migration 005 â€” Add slug and invite_code to families
 * Add security columns to members
 *
 * WHAT YOU'RE LEARNING:
 *   ALTER TABLE â€” how to add columns to existing tables
 *   without dropping and recreating them.
 *   This is how real apps evolve their schema over time.
 */
exports.up = async (db) => {
  // Add slug + invite_code to families
  await db.query(`
    ALTER TABLE families
      ADD COLUMN IF NOT EXISTS slug        VARCHAR(50)  UNIQUE,
      ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12)  UNIQUE;
  `);

  // Add security + tracking columns to members
  await db.query(`
    ALTER TABLE members
      ADD COLUMN IF NOT EXISTS email_verified  BOOLEAN   NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_login_at   TIMESTAMP,
      ADD COLUMN IF NOT EXISTS login_attempts  INTEGER   NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMP;
  `);

  console.log('âœ… Added: family slug/invite_code, member security columns');
};

exports.down = async (db) => {
  await db.query(`
    ALTER TABLE families
      DROP COLUMN IF EXISTS slug,
      DROP COLUMN IF EXISTS invite_code;
  `);
  await db.query(`
    ALTER TABLE members
      DROP COLUMN IF EXISTS email_verified,
      DROP COLUMN IF EXISTS last_login_at,
      DROP COLUMN IF EXISTS login_attempts,
      DROP COLUMN IF EXISTS locked_until;
  `);
  console.log('í·‘  Removed: family slug/invite_code, member security columns');
};
