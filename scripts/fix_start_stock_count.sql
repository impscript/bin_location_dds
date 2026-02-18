CREATE OR REPLACE FUNCTION public.start_stock_count(p_batch_name text, p_month integer, p_year integer, p_zone_ids uuid[], p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_stock_count_id uuid;
    v_zone_id uuid;
    v_stock_count_zone_id uuid;
BEGIN
    -- 1. Create Stock Count Header
    INSERT INTO stock_counts (batch_name, count_month, count_year, status, created_by)
    VALUES (p_batch_name, p_month, p_year, 'in_progress', p_user_id)
    RETURNING id INTO v_stock_count_id;

    -- 2. Loop through Zones
    FOREACH v_zone_id IN ARRAY p_zone_ids
    LOOP
        -- Create Zone Record
        INSERT INTO stock_count_zones (stock_count_id, zone_id, status, total_items, counted_items)
        VALUES (v_stock_count_id, v_zone_id, 'pending', 0, 0)
        RETURNING id INTO v_stock_count_zone_id;

        -- Snapshot Inventory for this Zone
        -- REMOVED 'variance' from INSERT because it is a GENERATED column
        INSERT INTO stock_count_items (
            stock_count_id,
            stock_count_zone_id,
            product_id,
            bin_id,
            system_qty,
            counted_qty,
            status
        )
        SELECT
            v_stock_count_id,
            v_stock_count_zone_id,
            i.product_id,
            i.bin_id,
            i.qty, -- Corrected: Use 'qty' as per table schema
            NULL,
            'pending'
        FROM inventory i
        JOIN bins b ON i.bin_id = b.id
        WHERE b.zone_id = v_zone_id;
        
        -- Update total items in zone
        UPDATE stock_count_zones
        SET total_items = (
            SELECT count(*) FROM stock_count_items 
            WHERE stock_count_zone_id = v_stock_count_zone_id
        )
        WHERE id = v_stock_count_zone_id;

    END LOOP;

    RETURN v_stock_count_id;
END;
$function$
