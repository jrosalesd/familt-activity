const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Tell PostgreSQL which schema to look in
  options:  '--search_path=family_management',
});

// After connecting, set the search_path to our schema.
// This means all queries run against family_management.members
// instead of public.members — no need to prefix every table name.
pool.on('connect', (client) => {
  const schema = process.env.DB_SCHEMA || 'public';
  client.query(`SET search_path TO ${schema}`);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    release();
    console.log(`✅ PostgreSQL connected → ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
    console.log(`   Schema: ${process.env.DB_SCHEMA || 'public'}`);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
