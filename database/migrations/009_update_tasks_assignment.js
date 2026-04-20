
exports.up = async (db) => {
  await db.query(`
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(10) NOT NULL DEFAULT 'all'
        CHECK (assignment_type IN ('all', 'specific', 'rotating'));
  `);
  await db.query(`
    ALTER TABLE task_completions
      ADD COLUMN IF NOT EXISTS rotation_index INTEGER DEFAULT 0;
  `);
  console.log('✅ Updated: tasks, task_completions');
};
exports.down = async (db) => {
  await db.query('ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_type');
  await db.query('ALTER TABLE task_completions DROP COLUMN IF EXISTS rotation_index');
  console.log('� Reverted: assignment_type, rotation_index');
};
