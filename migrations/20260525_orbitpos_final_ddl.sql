-- OrbitPOS Complete Final SQL Migration
-- Run this in your Supabase SQL editor to create/alter necessary tables and functions.

-- Add missing columns to stores table if they don't exist
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS tax1_name TEXT DEFAULT 'CGST',
  ADD COLUMN IF NOT EXISTS tax1_rate DECIMAL(5,2) DEFAULT 4.00,
  ADD COLUMN IF NOT EXISTS tax2_name TEXT DEFAULT 'SGST',
  ADD COLUMN IF NOT EXISTS tax2_rate DECIMAL(5,2) DEFAULT 4.00,
  ADD COLUMN IF NOT EXISTS loyalty_points_earn_value INTEGER DEFAULT 1;

-- Add missing columns to customers table if they don't exist
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add store_id to customers if missing (multi-tenant fix)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Create vendors table (for Purchase Orders)
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  gst_number TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add split payment columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS split_cash_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_card_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_upi_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_split_payment BOOLEAN DEFAULT false;

-- Create WhatsApp logs table (for OpenWA)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  phone_number TEXT,
  status TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Create cash_drawer_logs table
CREATE TABLE IF NOT EXISTS public.cash_drawer_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES public.profiles(id),
  date DATE NOT NULL,
  expected_cash DECIMAL(10,2) DEFAULT 0,
  declared_cash DECIMAL(10,2) DEFAULT 0,
  difference DECIMAL(10,2) DEFAULT 0,
  card_total DECIMAL(10,2) DEFAULT 0,
  upi_total DECIMAL(10,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  refunds_total DECIMAL(10,2) DEFAULT 0,
  discounts_total DECIMAL(10,2) DEFAULT 0,
  items_count INTEGER DEFAULT 0,
  first_sale_time TIMESTAMPTZ,
  last_sale_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id),
  po_number TEXT,
  status TEXT DEFAULT 'draft',
  expected_delivery DATE,
  notes TEXT,
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  ordered_quantity INTEGER NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (ordered_quantity * unit_cost) STORED
);

-- Enable RLS on new tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_drawer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Store admins manage vendors" ON public.vendors;
CREATE POLICY "Store admins manage vendors" ON public.vendors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND store_id = vendors.store_id AND role IN ('admin'))
);

DROP POLICY IF EXISTS "Store users view whatsapp_logs" ON public.whatsapp_logs;
CREATE POLICY "Store users view whatsapp_logs" ON public.whatsapp_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o JOIN public.profiles p ON p.store_id = o.store_id WHERE o.id = whatsapp_logs.order_id AND p.id = auth.uid())
);

DROP POLICY IF EXISTS "Store admins and cashiers can manage cash_drawer_logs" ON public.cash_drawer_logs;
CREATE POLICY "Store admins and cashiers can manage cash_drawer_logs"
ON public.cash_drawer_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND store_id = cash_drawer_logs.store_id AND role IN ('admin','cashier'))
);

DROP POLICY IF EXISTS "Admins manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Admins manage purchase orders" ON public.purchase_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND store_id = purchase_orders.store_id AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins manage purchase order items" ON public.purchase_order_items;
CREATE POLICY "Admins manage purchase order items" ON public.purchase_order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.profiles p ON p.store_id = po.store_id
    WHERE po.id = purchase_order_items.po_id AND p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Create overloaded increment_stock PL/pgSQL function (row_id, amount) for POS void/refund
CREATE OR REPLACE FUNCTION public.increment_stock(row_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + amount
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Create overloaded increment_stock PL/pgSQL function for PO reception
CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id UUID, p_qty INT, p_store_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  -- Update stock
  UPDATE public.products
  SET stock_quantity = stock_quantity + p_qty
  WHERE id = p_product_id AND store_id = p_store_id;

  -- Insert inventory log
  INSERT INTO public.inventory_logs(product_id, store_id, change_amount, reason)
  VALUES (p_product_id, p_store_id, p_qty, p_reason);
END;
$$ LANGUAGE plpgsql;
