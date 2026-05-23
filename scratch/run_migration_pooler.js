const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const projectRef = 'krtkqnuhqmymmaucrstx';

async function tryConnect(config, label) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✅ Connected via ${label}`);
    return client;
  } catch (err) {
    console.log(`❌ ${label} failed: ${err.message}`);
    return null;
  }
}

async function main() {
  let client = await tryConnect({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  }, 'Direct connection (service key)');

  if (!client) {
    for (const region of ['us-east-1', 'ap-southeast-1', 'eu-west-1', 'ap-south-1']) {
      client = await tryConnect({
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: 'postgres',
        user: `postgres.${projectRef}`,
        password: process.env.SUPABASE_SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      }, `Pooler ${region} (service key)`);
      if (client) break;
    }
  }

  if (client) {
    try {
      await client.query(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;`);
      console.log("✅ Added force_password_change column to profiles.");
    } catch (err) {
      console.error("DB Query Error:", err.message);
    } finally {
      await client.end();
    }
  }
}

main();
