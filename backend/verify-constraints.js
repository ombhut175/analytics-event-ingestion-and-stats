require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verify() {
  console.log('\n=== Checking constraints on site_daily_unique_users ===\n');
  
  const query = `
    SELECT conname, contype, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'site_daily_unique_users'::regclass;
  `;
  
  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} constraints:\n`);
  console.table(result.rows);

  const hasUserConstraint = result.rows.some(r => r.conname === 'unq_site_date_user');
  const hasVisitorConstraint = result.rows.some(r => r.conname === 'unq_site_date_visitor');

  console.log('\n=== Constraint Status ===');
  console.log(`✓ unq_site_date_visitor exists: ${hasVisitorConstraint ? 'YES ✅' : 'NO ❌'}`);
  console.log(`✓ unq_site_date_user removed: ${!hasUserConstraint ? 'YES ✅' : 'NO ❌ (still exists!)'}`);

  await pool.end();
}

verify().catch(console.error);
