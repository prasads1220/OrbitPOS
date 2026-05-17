-- OrbitPOS Serialized Inventory & Product Variants Migration Script

-- 1. Add control flags to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_serialized BOOLEAN DEFAULT FALSE;

-- 2. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  model_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_store_variant_sku UNIQUE (store_id, sku),
  CONSTRAINT unique_store_variant_barcode UNIQUE (store_id, barcode)
);

-- 3. Create serialized_inventory table
CREATE TABLE IF NOT EXISTS serialized_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE, -- Nullable if product is serialized but has no variants
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  serial_number TEXT NOT NULL,
  status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'transferred', 'returned')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_store_serial UNIQUE (store_id, serial_number)
);

-- 4. Update order_items to record variants and serials
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- 5. Enable Row Level Security (RLS) on new tables
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE serialized_inventory ENABLE ROW LEVEL SECURITY;

-- 6. Define multi-tenant RLS policies
DROP POLICY IF EXISTS "Store members can manage variants" ON product_variants;
CREATE POLICY "Store members can manage variants" ON product_variants FOR ALL USING (store_id = current_user_store_id());

DROP POLICY IF EXISTS "Store members can manage serialized inventory" ON serialized_inventory;
CREATE POLICY "Store members can manage serialized inventory" ON serialized_inventory FOR ALL USING (store_id = current_user_store_id());
