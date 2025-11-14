require('dotenv').config({ path: '.env.local' });
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function debug() {
  console.log('\n=== Checking site_daily_unique_users table ===\n');
  
  const query = `
    SELECT * FROM site_daily_unique_users 
    WHERE site_id = 'site_abc123' 
    AND date = '2024-11-14'
    ORDER BY visitor_id;
  `;
  
  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} rows:\n`);
  console.table(result.rows);

  console.log('\n=== Checking constraints ===\n');
  const constraintsQuery = `
    SELECT conname, contype, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'site_daily_unique_users'::regclass;
  `;
  
  const constraints = await pool.query(constraintsQuery);
  console.table(constraints.rows);

  console.log('\n=== Checking all rows with NULL visitor_id ===\n');
  const nullVisitorQuery = `
    SELECT site_id, date, user_id, visitor_id
    FROM site_daily_unique_users 
    WHERE visitor_id IS NULL
    LIMIT 10;
  `;
  
  const nullVisitors = await pool.query(nullVisitorQuery);
  console.log(`Found ${nullVisitors.rows.length} rows with NULL visitor_id:\n`);
  console.table(nullVisitors.rows);

  await pool.end();
}

debug().catch(console.error);
