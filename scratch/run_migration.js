const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const projectRef = 'krtkqnuhqmymmaucrstx';

async function main() {
  const password = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log("Connected to DB.");
    
    await client.query(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;`);
    console.log("Added force_password_change column to profiles.");
    
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
