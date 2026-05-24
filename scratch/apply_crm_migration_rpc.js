const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const migrationSQL = `
  -- Ensure customers table exists
  CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
  );

  -- Add store_id to customers table
  ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) DEFAULT '00000000-0000-0000-0000-000000000000';

  -- Add points_earned, points_redeemed to orders
  ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;

  -- Ensure customer_id on orders table
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

  -- Enable RLS
  ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

  -- Create policy for multi-tenant isolation
  DROP POLICY IF EXISTS "Store members can view/manage their customers" ON public.customers;
  CREATE POLICY "Store members can view/manage their customers" 
  ON public.customers 
  FOR ALL 
  USING (store_id = current_user_store_id());
`;

async function main() {
  console.log("=== OrbitPOS CRM RLS Migration via RPC ===\n");
  
  console.log("Calling exec_sql RPC function...");
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: migrationSQL });
  
  if (error) {
    console.error("❌ RPC Error:", error.message);
    
    // Alternative: Try direct HTTP call to rpc/exec_sql
    console.log("Trying alternative REST RPC endpoint directly...");
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql_text: migrationSQL })
      });
      console.log("REST RPC Response Status:", res.status);
      const text = await res.text();
      console.log("REST RPC Response Text:", text);
    } catch (e) {
      console.error("REST RPC Error:", e.message);
    }
  } else {
    console.log("   ✅ Migration executed successfully via RPC!");
    console.log("   Result:", data);
  }
}

main().catch(console.error);
