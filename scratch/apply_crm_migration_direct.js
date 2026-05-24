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
  const password = process.argv[2];
  if (!password) {
    console.log("=== OrbitPOS CRM Direct DB Migration ===");
    console.log("Please run this script with your database password as an argument:");
    console.log("node scratch/apply_crm_migration_direct.js YOUR_DATABASE_PASSWORD\n");
    console.log("You can find your database password in the Supabase Dashboard under Settings -> Database.");
    process.exit(1);
  }

  console.log("Connecting to Supabase PostgreSQL database...\n");
  
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
  }, 'Direct connection (provided password)');

  // Try poolers if direct connection fails
  if (!client) {
    for (const region of ['ap-south-1', 'us-east-1', 'ap-southeast-1', 'eu-west-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'ca-central-1', 'sa-east-1']) {
      client = await tryConnect({
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: 'postgres',
        user: `postgres.${projectRef}`,
        password: password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      }, `Pooler ${region} (provided password)`);
      if (client) break;
    }
  }

  if (!client) {
    console.error("❌ Could not connect to Supabase database. Please check your password and network.");
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

    // Set default store_id for existing records
    await client.query(`
      UPDATE public.customers SET store_id = '00000000-0000-0000-0000-000000000000' WHERE store_id IS NULL;
    `);
    console.log("Set default store_id for any existing customers.");

    // Verify
    const resColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'customers';
    `);
    console.log("\n✅ Migration complete! Final Customers Table Columns:");
    resColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

  } catch (err) {
    console.error("❌ Migration Error:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("Fatal Error:", err.message);
});
