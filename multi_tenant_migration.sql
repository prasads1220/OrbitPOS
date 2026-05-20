-- OrbitPOS Multi-Tenant Migration Script
-- IMPORTANT: Run these in order!

-- ==========================================
-- STEP 1: ADD THE NEW ROLE
-- Run ONLY the line below first, then click RUN.
-- ==========================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- ==========================================
-- STEP 2: RUN THE REST OF THE MIGRATION
-- After Step 1 finishes, copy and run EVERYTHING BELOW this line.
-- ==========================================

-- 1. Create the stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    branding_logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert a default store to associate existing data
INSERT INTO stores (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Store')
ON CONFLICT DO NOTHING;

-- 3. Add store_id to all existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) DEFAULT '00000000-0000-0000-0000-000000000000';

-- 4. Create a stable function to get the current user's store_id
CREATE OR REPLACE FUNCTION current_user_store_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT store_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5. Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 6. Define tight, secure policies
-- STORES: Everyone can see store names/logos
DROP POLICY IF EXISTS "Anyone can view stores" ON stores;
CREATE POLICY "Anyone can view stores" ON stores FOR SELECT USING (true);

-- PROFILES: You can always see yourself, or others in your store
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view store members" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can view store members" ON profiles FOR SELECT USING (store_id = current_user_store_id());

-- PRODUCTS: Filtered by store
DROP POLICY IF EXISTS "Store members can view their products" ON products;
CREATE POLICY "Store members can view their products" ON products FOR ALL USING (store_id = current_user_store_id());

-- ORDERS: Filtered by store
DROP POLICY IF EXISTS "Store members can view their orders" ON orders;
CREATE POLICY "Store members can view their orders" ON orders FOR ALL USING (store_id = current_user_store_id());

-- INVENTORY/ATTENDANCE: Filtered by store
DROP POLICY IF EXISTS "Store members can view logs" ON inventory_logs;
CREATE POLICY "Store members can view logs" ON inventory_logs FOR ALL USING (store_id = current_user_store_id());

DROP POLICY IF EXISTS "Store members can view attendance" ON attendance;
CREATE POLICY "Store members can view attendance" ON attendance FOR ALL USING (store_id = current_user_store_id());

-- 7. Fix existing data one last time
UPDATE profiles SET store_id = '00000000-0000-0000-0000-000000000000' WHERE store_id IS NULL;
UPDATE products SET store_id = '00000000-0000-0000-0000-000000000000' WHERE store_id IS NULL;
UPDATE orders SET store_id = '00000000-0000-0000-0000-000000000000' WHERE store_id IS NULL;
