
exports.up = async (db) => {
  await db.query(`
    ALTER TABLE members ALTER COLUMN pin_hash TYPE VARCHAR(255);
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id   ON task_assignments(task_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_task_assignments_member_id ON task_assignments(member_id)');
  console.log('✅ Created: task_assignments');
};
exports.down = async (db) => {
  await db.query('DROP TABLE IF EXISTS task_assignments');
  console.log('� Dropped: task_assignments');
};
