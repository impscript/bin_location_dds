-- ============================================================
-- Migration: Create delivery_orders table
-- Description: Table to store Delivery Order (DO) data imported from Excel/CSV
-- ============================================================

-- 1. Create delivery_orders table
CREATE TABLE IF NOT EXISTS public.delivery_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_number text NOT NULL,
    document_date date NOT NULL,
    purchase_order_no text,
    reference_no text,
    customer_name text NOT NULL,
    shipping_address text NOT NULL,
    product_code text,
    item_name text NOT NULL,
    unit text,
    qty integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,
    printed_at timestamptz,
    printed_by uuid
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_orders_doc_number ON public.delivery_orders(document_number);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_doc_date ON public.delivery_orders(document_date);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON public.delivery_orders(customer_name);

-- 3. Enable RLS
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Allow anon select delivery_orders" ON public.delivery_orders
    FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert delivery_orders" ON public.delivery_orders
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update delivery_orders" ON public.delivery_orders
    FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete delivery_orders" ON public.delivery_orders
    FOR DELETE TO anon USING (true);