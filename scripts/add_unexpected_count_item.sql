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
    p_user_id uuid
) RETURNS void AS $$
DECLARE
    v_product_id uuid;
    v_existing_item_id uuid;
BEGIN
    -- 1. Try to find the product by ns_code or product_code
    SELECT id INTO v_product_id FROM products 
    WHERE (ns_code = p_ns_code AND ns_code IS NOT NULL AND ns_code != '')
       OR (product_code = p_product_code AND product_code IS NOT NULL AND product_code != '')
    LIMIT 1;

    -- 2. If it doesn't exist, insert it
    IF v_product_id IS NULL THEN
        INSERT INTO products (ns_code, product_code, product_name, ns_name, unit, ns_sub_group)
        VALUES (p_ns_code, p_product_code, p_product_name, p_product_name, p_unit, p_ns_sub_group)
        RETURNING id INTO v_product_id;
    ELSE
        -- Update existing product details just in case
        UPDATE products 
        SET product_name = COALESCE(p_product_name, product_name),
            ns_name = COALESCE(p_product_name, ns_name),
            unit = COALESCE(p_unit, unit),
            ns_sub_group = COALESCE(p_ns_sub_group, ns_sub_group),
            updated_at = NOW()
        WHERE id = v_product_id;
    END IF;

    -- 3. Check if this item is already in the count sheet
    SELECT id INTO v_existing_item_id 
    FROM stock_count_items 
    WHERE stock_count_zone_id = p_stock_count_zone_id 
      AND product_id = v_product_id 
      AND bin_id = p_bin_id
    LIMIT 1;

    -- 4. Insert or Update stock_count_items
    IF v_existing_item_id IS NOT NULL THEN
        -- If somehow it was already there (maybe pending), just update it to counted
        UPDATE stock_count_items
        SET counted_qty = COALESCE(counted_qty, 0) + p_qty,
            variance = (COALESCE(counted_qty, 0) + p_qty) - system_qty,
            status = 'counted',
            counted_by = p_user_id,
            counted_at = NOW()
        WHERE id = v_existing_item_id;
    ELSE
        -- Insert as new unexpected item
        INSERT INTO stock_count_items (
            stock_count_id, 
            stock_count_zone_id, 
            product_id, 
            bin_id, 
            system_qty, 
            counted_qty, 
            variance, 
            status, 
            counted_by, 
            counted_at
        ) VALUES (
            p_stock_count_id,
            p_stock_count_zone_id,
            v_product_id,
            p_bin_id,
            0, -- unexpected item, system qty was 0
            p_qty,
            p_qty, -- variance is strictly the counted_qty since system is 0
            'counted',
            p_user_id,
            NOW()
        );
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
