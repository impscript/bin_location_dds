-- ============================================================
-- Migration: Create premium_memos table
-- Description: Table to store premium (freebie) memos imported from Excel/CSV
-- ============================================================

-- 1. Create premium_memos table
CREATE TABLE IF NOT EXISTS public.premium_memos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    etd_date date NOT NULL,
    if_number text NOT NULL,
    customer_code text,
    customer_name text NOT NULL,
    shipping_address text NOT NULL,
    item_name text NOT NULL,
    qty integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'printed', 'shipped', 'cancelled'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid, -- References users(id) in public schema
    printed_at timestamptz,
    printed_by uuid, -- References users(id) in public schema
    shipped_at timestamptz,
    shipped_by uuid,  -- References users(id) in public schema
    CONSTRAINT unique_if_number_item UNIQUE (if_number, item_name)
);

-- 2. Create Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_premium_memos_if_number ON public.premium_memos(if_number);
CREATE INDEX IF NOT EXISTS idx_premium_memos_etd_date ON public.premium_memos(etd_date);
CREATE INDEX IF NOT EXISTS idx_premium_memos_status ON public.premium_memos(status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.premium_memos ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Since the app uses client-side simulated login via Anon key)
-- Policy: Allow anyone (anon) to read premium_memos
CREATE POLICY "Allow anon select premium_memos" ON public.premium_memos
    FOR SELECT TO anon USING (true);

-- Policy: Allow anyone (anon) to insert premium_memos
CREATE POLICY "Allow anon insert premium_memos" ON public.premium_memos
    FOR INSERT TO anon WITH CHECK (true);

-- Policy: Allow anyone (anon) to update premium_memos
CREATE POLICY "Allow anon update premium_memos" ON public.premium_memos
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policy: Allow anyone (anon) to delete premium_memos
CREATE POLICY "Allow anon delete premium_memos" ON public.premium_memos
    FOR DELETE TO anon USING (true);
