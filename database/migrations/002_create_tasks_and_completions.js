exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id                SERIAL PRIMARY KEY,
      family_id         INTEGER     NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      created_by        INTEGER     NOT NULL REFERENCES members(id),
      title             VARCHAR(150) NOT NULL,
      description       TEXT,
      type              VARCHAR(20) NOT NULL DEFAULT 'chore'
                          CHECK (type IN ('chore','homework','behaviour','one-off','challenge')),
      points_value      INTEGER     NOT NULL DEFAULT 10,
      requires_approval BOOLEAN     NOT NULL DEFAULT true,
      is_recurring      BOOLEAN     NOT NULL DEFAULT false,
      recurrence        VARCHAR(20) CHECK (recurrence IN ('daily','weekly','monthly') OR recurrence IS NULL),
      assigned_to       INTEGER     REFERENCES members(id) ON DELETE SET NULL,
      is_active         BOOLEAN     NOT NULL DEFAULT true,
      created_at        TIMESTAMP   NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS task_completions (
      id               SERIAL PRIMARY KEY,
      task_id          INTEGER   NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      member_id        INTEGER   NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
      points_awarded   INTEGER,
      approved_by      INTEGER   REFERENCES members(id),
      note             TEXT,
      rejection_reason TEXT,
      completed_at     TIMESTAMP NOT NULL DEFAULT NOW(),
      approved_at      TIMESTAMP
    );
  `);

  console.log('âœ… Created: tasks, task_completions');
};

exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS task_completions');
  await db.query('DROP TABLE IF EXISTS tasks');
  console.log('í·‘  Dropped: tasks, task_completions');
};
