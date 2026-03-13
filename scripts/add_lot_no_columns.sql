-- ============================================================
-- Migration: Add lot_no column to tables that need it
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. Add lot_no to inventory table (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'inventory' 
          AND column_name = 'lot_no'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN lot_no text;
        RAISE NOTICE 'Added lot_no to inventory table';
    ELSE
        RAISE NOTICE 'lot_no already exists on inventory table';
    END IF;
END $$;

-- 2. Add lot_no to inventory_logs table (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'inventory_logs' 
          AND column_name = 'lot_no'
    ) THEN
        ALTER TABLE public.inventory_logs ADD COLUMN lot_no text;
        RAISE NOTICE 'Added lot_no to inventory_logs table';
    ELSE
        RAISE NOTICE 'lot_no already exists on inventory_logs table';
    END IF;
END $$;

-- Verify
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('inventory', 'inventory_logs')
  AND column_name = 'lot_no'
ORDER BY table_name;
