require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const db   = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const dim    = (s) => `\x1b[2m${s}\x1b[0m`;

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id       SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      batch    INTEGER      NOT NULL,
      ran_at   TIMESTAMP    NOT NULL DEFAULT NOW()
    );
  `);
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js') && f !== 'migrate.js')
    .sort();
}

async function getRanMigrations() {
  const { rows } = await db.query('SELECT filename, batch FROM _migrations ORDER BY id');
  return rows;
}

async function getCurrentBatch() {
  const { rows } = await db.query('SELECT MAX(batch) as batch FROM _migrations');
  return rows[0].batch || 0;
}

async function migrate() {
  await ensureMigrationsTable();
  const allFiles = getMigrationFiles();
  const ran      = await getRanMigrations();
  const ranNames = ran.map(r => r.filename);
  const pending  = allFiles.filter(f => !ranNames.includes(f));

  if (pending.length === 0) {
    console.log(green('  Nothing to migrate — already up to date.'));
    return;
  }

  const batch = (await getCurrentBatch()) + 1;
  console.log(cyan(`\n  Running ${pending.length} migration(s) — batch ${batch}:\n`));

  for (const filename of pending) {
    process.stdout.write(`  ⏳ ${filename} ...`);
    try {
      const file = require(path.join(MIGRATIONS_DIR, filename));
      await file.up(db);
      await db.query('INSERT INTO _migrations (filename, batch) VALUES ($1, $2)', [filename, batch]);
      console.log(`\r  ${green('✅')} ${filename}`);
    } catch (err) {
      console.log(`\r  ${red('❌')} ${filename}`);
      console.error(red(`     Error: ${err.message}`));
      process.exit(1);
    }
  }

  console.log(green(`\n  ✨ Migrated ${pending.length} file(s) in batch ${batch}.\n`));
}

async function rollback() {
  await ensureMigrationsTable();
  const batch = await getCurrentBatch();
  if (batch === 0) { console.log(yellow('  Nothing to rollback.')); return; }

  const { rows } = await db.query(
    'SELECT filename FROM _migrations WHERE batch = $1 ORDER BY id DESC', [batch]
  );

  console.log(cyan(`\n  Rolling back batch ${batch} (${rows.length} migration(s)):\n`));

  for (const { filename } of rows) {
    process.stdout.write(`  ⏳ ${filename} ...`);
    try {
      const file = require(path.join(MIGRATIONS_DIR, filename));
      await file.down(db);
      await db.query('DELETE FROM _migrations WHERE filename = $1', [filename]);
      console.log(`\r  ${green('✅')} ${filename} ${dim('(rolled back)')}`);
    } catch (err) {
      console.log(`\r  ${red('❌')} ${filename}`);
      console.error(red(`     Error: ${err.message}`));
      process.exit(1);
    }
  }
  console.log(green(`\n  ✨ Rolled back batch ${batch}.\n`));
}

async function status() {
  await ensureMigrationsTable();
  const allFiles = getMigrationFiles();
  const ran      = await getRanMigrations();
  const ranMap   = Object.fromEntries(ran.map(r => [r.filename, r.batch]));

  console.log(cyan('\n  Migration Status:\n'));
  console.log(`  ${'Filename'.padEnd(55)} ${'Status'.padEnd(12)} Batch`);
  console.log('  ' + '─'.repeat(75));

  allFiles.forEach(file => {
    const didRun = ranMap[file] !== undefined;
    const status = didRun ? green('  ✅ Ran') : yellow('  ⏳ Pending');
    const batch  = didRun ? dim(`   ${ranMap[file]}`) : '';
    console.log(`  ${file.padEnd(55)} ${status}${batch}`);
  });
  console.log();
}

async function fresh() {
  console.log(red('\n  ⚠️  Dropping all tables and re-running migrations...\n'));
  const { rows } = await db.query('SELECT filename FROM _migrations ORDER BY id DESC');
  for (const { filename } of rows) {
    const file = require(path.join(MIGRATIONS_DIR, filename));
    await file.down(db);
    await db.query('DELETE FROM _migrations WHERE filename = $1', [filename]);
  }
  await migrate();
}

const arg     = process.argv[2];
const actions = { '--rollback': rollback, '--status': status, '--fresh': fresh };

(actions[arg] || migrate)()
  .then(() => process.exit(0))
  .catch(err => { console.error(red(`\n  ❌ ${err.message}\n`)); process.exit(1); });
