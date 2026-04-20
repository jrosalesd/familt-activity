require('dotenv').config();
const db     = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function seed() {
  console.log('\n��� Seeding database...\n');

  // ── Clean existing data ───────────────────────────────────────────────────
  await db.query('DELETE FROM invites');
  await db.query('DELETE FROM task_completions');
  await db.query('DELETE FROM redemptions');
  await db.query('DELETE FROM points_ledger');
  await db.query('DELETE FROM family_pool');
  await db.query('DELETE FROM tasks');
  await db.query('DELETE FROM rewards');
  await db.query('DELETE FROM members');
  await db.query('DELETE FROM families');
  console.log('��� Cleaned existing data');

  // ── Create family ─────────────────────────────────────────────────────────
  const slug        = 'rosales-guzman';
  const inviteCode  = crypto.randomBytes(9).toString('base64url').slice(0, 12);

  const { rows: [family] } = await db.query(`
    INSERT INTO families (name, slug, invite_code)
    VALUES ($1, $2, $3)
    RETURNING *
  `, ['Rosales Guzman', slug, inviteCode]);

  console.log(`✅ Family: ${family.name} (ID: ${family.id})`);

  // ── Create parent ─────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);
  const { rows: [parent] } = await db.query(`
    INSERT INTO members (family_id, name, email, password_hash, role, avatar_color)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [family.id, 'Parent', 'parent@family.com', passwordHash, 'parent', '#1e1b4b']);

  console.log(`✅ Parent: ${parent.name} (${parent.email})`);

  // ── Create children ───────────────────────────────────────────────────────
  const children = [
    { name: 'Alice',   pin: '1234', color: '#e74c3c' },
    { name: 'Bob',     pin: '5678', color: '#2ecc71' },
    { name: 'Charlie', pin: '9999', color: '#3498db' },
  ];

  for (const child of children) {
    await db.query(`
      INSERT INTO members (family_id, name, pin, role, avatar_color)
      VALUES ($1, $2, $3, $4, $5)
    `, [family.id, child.name, child.pin, 'child', child.color]);
    console.log(`✅ Child: ${child.name} (PIN: ${child.pin})`);
  }

  // ── Family pool ───────────────────────────────────────────────────────────
  await db.query('INSERT INTO family_pool (family_id) VALUES ($1)', [family.id]);

  // ── Rewards ───────────────────────────────────────────────────────────────
  const rewards = [
    { title: '30 min Screen Time',  type: 'screen_time', cost: 50,  approval: false },
    { title: '1 hr Screen Time',    type: 'screen_time', cost: 90,  approval: false },
    { title: '$1 Allowance',        type: 'money',       cost: 100, approval: true  },
    { title: 'Choose Dinner',       type: 'outing',      cost: 150, approval: true  },
    { title: 'Small Treat',         type: 'treat',       cost: 30,  approval: false },
    { title: 'Movie Night Pick',    type: 'outing',      cost: 200, approval: true  },
  ];

  for (const r of rewards) {
    await db.query(`
      INSERT INTO rewards (family_id, title, type, points_cost, requires_approval)
      VALUES ($1, $2, $3, $4, $5)
    `, [family.id, r.title, r.type, r.cost, r.approval]);
    console.log(`✅ Reward: ${r.title} (${r.cost} pts)`);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const tasks = [
    { title: 'Wash the dishes',     type: 'chore',     pts: 15, recurrence: 'daily',   approval: true  },
    { title: 'Make your bed',       type: 'chore',     pts: 10, recurrence: 'daily',   approval: false },
    { title: 'Do homework',         type: 'homework',  pts: 20, recurrence: 'daily',   approval: true  },
    { title: 'Clean your room',     type: 'chore',     pts: 25, recurrence: 'weekly',  approval: true  },
    { title: 'Be kind to siblings', type: 'behaviour', pts: 10, recurrence: 'daily',   approval: false },
    { title: 'Read for 20 mins',    type: 'homework',  pts: 15, recurrence: 'daily',   approval: false },
  ];

  for (const t of tasks) {
    await db.query(`
      INSERT INTO tasks (family_id, created_by, title, type, points_value, requires_approval, is_recurring, recurrence)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [family.id, parent.id, t.title, t.type, t.pts, t.approval, true, t.recurrence]);
    console.log(`✅ Task: ${t.title} (${t.pts} pts)`);
  }

  // ── Sample invite ─────────────────────────────────────────────────────────
  const inviteCode2 = crypto.randomBytes(9).toString('base64url').slice(0, 12);
  const expiresAt   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.query(`
    INSERT INTO invites (family_id, code, role, created_by, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `, [family.id, inviteCode2, 'child', parent.id, expiresAt]);

  console.log(`
─────────────────────────────────────────────────
✨ Seed complete!

Parent login (go to /login):
  Email:    parent@family.com
  Password: password123

Kids login (go to /login/kids):
  Enter email: parent@family.com
  Then pick a child:
  Alice   → PIN: 1234
  Bob     → PIN: 5678
  Charlie → PIN: 9999

Test invite link (join as child):
  http://localhost:3000/join/${inviteCode2}
─────────────────────────────────────────────────
  `);

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
