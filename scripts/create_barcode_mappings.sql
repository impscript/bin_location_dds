-- ============================================================
-- Migration: Create barcode_mappings table
-- Description: Table to map legacy product codes (PRODCODE) to barcodes
-- ============================================================

-- 1. Create barcode_mappings table
CREATE TABLE IF NOT EXISTS public.barcode_mappings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    prod_code text NOT NULL UNIQUE,
    barcode text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_barcode_mappings_prod_code ON public.barcode_mappings(prod_code);
CREATE INDEX IF NOT EXISTS idx_barcode_mappings_barcode ON public.barcode_mappings(barcode);

-- 3. Enable RLS
ALTER TABLE public.barcode_mappings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Allow anon select barcode_mappings" ON public.barcode_mappings
    FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert barcode_mappings" ON public.barcode_mappings
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update barcode_mappings" ON public.barcode_mappings
    FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete barcode_mappings" ON public.barcode_mappings
    FOR DELETE TO anon USING (true);
