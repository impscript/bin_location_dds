-- ============================================================
-- Migration: Add shipping columns to delivery_orders table
-- Description: Add shipped_at and shipped_by columns to support status logging
-- ============================================================

ALTER TABLE public.delivery_orders
ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
ADD COLUMN IF NOT EXISTS shipped_by uuid;
