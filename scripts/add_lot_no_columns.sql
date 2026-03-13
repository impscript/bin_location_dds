-- ============================================================
-- Migration: Add lot_no column to tables that need it
-- Run this BEFORE running upsert_inventory_csv_with_lot.sql
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

-- 2. Add lot_no to inventory_transactions table (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'inventory_transactions' 
          AND column_name = 'lot_no'
    ) THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN lot_no text;
        RAISE NOTICE 'Added lot_no to inventory_transactions table';
    ELSE
        RAISE NOTICE 'lot_no already exists on inventory_transactions table';
    END IF;
END $$;

-- 3. Add lot_no to inventory_logs table (if not already present)
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

-- Verify: Show current columns for all 3 tables
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('inventory', 'inventory_transactions', 'inventory_logs')
  AND column_name = 'lot_no'
ORDER BY table_name;
