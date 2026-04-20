/**
 * Migration 008 â€” Create roles table
 *
 * WHAT YOU'RE LEARNING:
 *   Moving configuration from code into the database.
 *   This is called "data-driven design" â€” behaviour is controlled
 *   by data you can change at runtime, not code you have to redeploy.
 *
 *   We seed default roles inside the migration itself because
 *   roles are structural data (like a lookup table), not test data.
 *   They need to exist for the app to function at all.
 */
exports.up = async (db) => {
  // Create roles table
  await db.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id          SERIAL       PRIMARY KEY,
      value       VARCHAR(30)  NOT NULL UNIQUE,
      label       VARCHAR(50)  NOT NULL,
      description TEXT,
      can_approve BOOLEAN      NOT NULL DEFAULT false,
      can_manage  BOOLEAN      NOT NULL DEFAULT false,
      uses_pin    BOOLEAN      NOT NULL DEFAULT false,
      is_active   BOOLEAN      NOT NULL DEFAULT true,
      sort_order  INTEGER      NOT NULL DEFAULT 0,
      created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);

  // Seed default roles
  await db.query(`
    INSERT INTO roles (value, label, description, can_approve, can_manage, uses_pin, sort_order)
    VALUES
      ('parent',        'Parent',        'Full access â€” manage members, tasks, rewards and approvals', true,  true,  false, 1),
      ('trusted_adult', 'Trusted Adult', 'Can approve tasks and rewards but cannot manage members',    true,  false, false, 2),
      ('child',         'Child',         'Can complete tasks and redeem rewards',                      false, false, true,  3)
    ON CONFLICT (value) DO NOTHING;
  `);

  console.log('âœ… Created: roles');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS roles');
  console.log('í·‘  Dropped: roles');
};
