-- ============================================================
-- Update RPCs to support p_lot_no
-- Matches actual schema:
--   bins: bin_code (not code)
--   inventory: qty (not quantity)
--   inventory_logs: bin_id_from, bin_id_to, qty_before, qty_after, performed_by
--   products: no created_by column
-- ============================================================

-- Update add_product_to_inventory
CREATE OR REPLACE FUNCTION add_product_to_inventory(
    p_ns_code text,
    p_product_code text,
    p_product_name text,
    p_unit text,
    p_ns_sub_group text,
    p_bin_id uuid,
    p_qty int,
    p_lot_no text,
    p_user_id uuid
) RETURNS void AS $$
DECLARE
    v_product_id uuid;
    v_inventory_id uuid;
    v_old_qty integer;
BEGIN
    -- 1. Get or create product
    SELECT id INTO v_product_id FROM products 
    WHERE (ns_code = p_ns_code AND ns_code IS NOT NULL AND ns_code != '')
       OR (product_code = p_product_code AND product_code IS NOT NULL AND product_code != '')
    LIMIT 1;

    IF v_product_id IS NULL THEN
        INSERT INTO products (ns_code, product_code, product_name, ns_name, unit, ns_sub_group)
        VALUES (p_ns_code, p_product_code, p_product_name, p_product_name, p_unit, p_ns_sub_group)
        RETURNING id INTO v_product_id;
    END IF;

    -- 2. Update/Insert Inventory (uses qty, not quantity)
    SELECT id, qty INTO v_inventory_id, v_old_qty FROM inventory 
    WHERE product_id = v_product_id 
      AND bin_id = p_bin_id 
      AND (COALESCE(lot_no, '') = COALESCE(p_lot_no, ''))
    LIMIT 1;

    IF v_inventory_id IS NOT NULL THEN
        UPDATE inventory 
        SET qty = COALESCE(qty, 0) + p_qty, updated_at = NOW()
        WHERE id = v_inventory_id;
    ELSE
        v_old_qty := 0;
        INSERT INTO inventory (product_id, bin_id, lot_no, qty)
        VALUES (v_product_id, p_bin_id, p_lot_no, p_qty);
    END IF;

    -- 3. Log (uses bin_id_from, bin_id_to, qty_before, qty_after, performed_by)
    INSERT INTO inventory_logs (product_id, action, bin_id_from, bin_id_to, qty_before, qty_after, lot_no, performed_by, notes)
    VALUES (v_product_id, 'adjust', NULL, p_bin_id, COALESCE(v_old_qty, 0), COALESCE(v_old_qty, 0) + p_qty, p_lot_no, p_user_id, 'Added via UI');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update add_unexpected_count_item
CREATE OR REPLACE FUNCTION add_unexpected_count_item(
    p_stock_count_id uuid,
    p_stock_count_zone_id uuid,
    p_bin_id uuid,
    p_ns_code text,
    p_product_code text,
    p_product_name text,
    p_unit text,
    p_ns_sub_group text,
    p_qty int,
    p_lot_no text,
    p_user_id uuid
) RETURNS void AS $$
DECLARE
    v_product_id uuid;
    v_existing_item_id uuid;
BEGIN
    -- 1. Try to find the product
    SELECT id INTO v_product_id FROM products 
    WHERE (ns_code = p_ns_code AND ns_code IS NOT NULL AND ns_code != '')
       OR (product_code = p_product_code AND product_code IS NOT NULL AND product_code != '')
    LIMIT 1;

    -- 2. Insert if not exists
    IF v_product_id IS NULL THEN
        INSERT INTO products (ns_code, product_code, product_name, ns_name, unit, ns_sub_group)
        VALUES (p_ns_code, p_product_code, p_product_name, p_product_name, p_unit, p_ns_sub_group)
        RETURNING id INTO v_product_id;
    END IF;

    -- 3. Upsert stock_count_items
    SELECT id INTO v_existing_item_id 
    FROM stock_count_items 
    WHERE stock_count_zone_id = p_stock_count_zone_id 
      AND product_id = v_product_id 
      AND bin_id = p_bin_id
    LIMIT 1;

    IF v_existing_item_id IS NOT NULL THEN
        UPDATE stock_count_items
        SET counted_qty = COALESCE(counted_qty, 0) + p_qty,
            status = 'counted',
            counted_by = p_user_id,
            counted_at = NOW()
        WHERE id = v_existing_item_id;
    ELSE
        INSERT INTO stock_count_items (
            stock_count_id, stock_count_zone_id, product_id, bin_id, 
            system_qty, counted_qty, status, counted_by, counted_at
        ) VALUES (
            p_stock_count_id, p_stock_count_zone_id, v_product_id, p_bin_id,
            0, p_qty, 'counted', p_user_id, NOW()
        );
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
