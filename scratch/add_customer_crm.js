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
  console.log("=== OrbitPOS CRM Database Migration ===\n");
  console.log("Trying to connect to your Supabase database...\n");

  const password = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!password) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in env.");
    process.exit(1);
  }

  let client = null;

  // Try direct connection first
  client = await tryConnect({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  }, 'Direct connection (service key)');

  // Try poolers if direct connection fails
  if (!client) {
    for (const region of ['ap-south-1', 'us-east-1', 'ap-southeast-1', 'eu-west-1']) {
      client = await tryConnect({
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: 'postgres',
        user: `postgres.${projectRef}`,
        password: password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      }, `Pooler ${region} (service key)`);
      if (client) break;
    }
  }

  if (!client) {
    console.error("Could not connect to Supabase database. Connection failed.");
    process.exit(1);
  }

  try {
    console.log("\n--- Creating / Migrating customers Table ---");
    // Ensure customers table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.customers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        loyalty_points INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
    `);
    console.log("Customers table verified.");

    // Add store_id to customers table
    await client.query(`
      ALTER TABLE public.customers 
      ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) DEFAULT '00000000-0000-0000-0000-000000000000';
    `);
    console.log("Added store_id to customers table.");

    console.log("\n--- Creating / Migrating orders Table Columns ---");
    // Add points_earned, points_redeemed to orders
    await client.query(`
      ALTER TABLE public.orders 
      ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;
    `);
    console.log("Added points_earned and points_redeemed to orders table.");

    // Ensure customer_id is UUID referencing customers(id)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'customer_id'
        ) THEN
          ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log("Verified customer_id on orders table.");

    console.log("\n--- Setting up Row Level Security (RLS) ---");
    // Enable RLS
    await client.query(`
      ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
    `);
    console.log("RLS enabled on customers table.");

    // Create policy for multi-tenant isolation
    await client.query(`
      DROP POLICY IF EXISTS "Store members can view/manage their customers" ON public.customers;
      CREATE POLICY "Store members can view/manage their customers" 
      ON public.customers 
      FOR ALL 
      USING (store_id = current_user_store_id());
    `);
    console.log("Created multi-tenant RLS policy on customers table.");

    // Verify
    const resColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'customers';
    `);
    console.log("\nFinal Customers Table Columns:");
    resColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

  } catch (err) {
    console.error("Migration Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
