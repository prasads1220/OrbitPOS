-- OrbitPOS Enhancement Migration
-- Adds vendor fields to products, creates vendor_invoices and stock_transfers tables

-- 1. Update products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS product_type TEXT CHECK (product_type IN ('gadget', 'non-gadget')) DEFAULT 'non-gadget';

-- 2. Create vendor_invoices table
CREATE TABLE IF NOT EXISTS vendor_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_name TEXT NOT NULL,
    invoice_url TEXT NOT NULL,
    store_id UUID REFERENCES stores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invoice_date DATE DEFAULT CURRENT_DATE
);

-- 3. Create stock_transfers table
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_store_id UUID REFERENCES stores(id) NOT NULL,
    target_store_id UUID REFERENCES stores(id) NOT NULL,
    items JSONB NOT NULL, -- Array of {product_id, sku, name, quantity}
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID REFERENCES profiles(id)
);

-- 4. Enable RLS
ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

-- 5. Define Policies
-- Vendor Invoices: Admins of the store can manage
DROP POLICY IF EXISTS "Admins can manage vendor invoices" ON vendor_invoices;
CREATE POLICY "Admins can manage vendor invoices" ON vendor_invoices
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin' 
        AND profiles.store_id = vendor_invoices.store_id
    )
);

-- Stock Transfers: 
-- Source store admins can create/view
-- Target store admins/employees can view/confirm
DROP POLICY IF EXISTS "Users can view relevant stock transfers" ON stock_transfers;
CREATE POLICY "Users can view relevant stock transfers" ON stock_transfers
FOR SELECT USING (
    source_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
    OR 
    target_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can create transfers" ON stock_transfers;
CREATE POLICY "Admins can create transfers" ON stock_transfers
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin' 
        AND profiles.store_id = stock_transfers.source_store_id
    )
);

DROP POLICY IF EXISTS "Target store can confirm transfers" ON stock_transfers;
CREATE POLICY "Target store can confirm transfers" ON stock_transfers
FOR UPDATE USING (
    target_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
);
