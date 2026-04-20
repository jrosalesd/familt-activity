
exports.up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS task_assignments (
      id         SERIAL    PRIMARY KEY,
      task_id    INTEGER   NOT NULL REFERENCES tasks(id)   ON DELETE CASCADE,
      member_id  INTEGER   NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      sort_order INTEGER   NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(task_id, member_id)
    );
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id   ON task_assignments(task_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_task_assignments_member_id ON task_assignments(member_id)');
  console.log('✅ Created: task_assignments');
};
exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS task_assignments');
  console.log('� Dropped: task_assignments');
};
