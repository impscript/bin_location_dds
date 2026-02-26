-- Fixes the complete_stock_count RPC to insert into inventory_logs correctly
-- and updates the inventory table using the 'qty' column.

CREATE OR REPLACE FUNCTION public.complete_stock_count(p_stock_count_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_item RECORD;
    v_adjustment_qty INTEGER;
BEGIN
    -- Loop through all items in this stock count that have been counted
    FOR v_item IN 
        SELECT * FROM stock_count_items 
        WHERE stock_count_id = p_stock_count_id 
        AND status = 'counted'
    LOOP
        v_adjustment_qty := v_item.counted_qty - v_item.system_qty;

        -- If there is a difference, adjust inventory
        IF v_adjustment_qty <> 0 THEN
            -- 1. Create movement log in inventory_logs using proper columns
            INSERT INTO inventory_logs (
                product_id, 
                bin_id_from,     -- Map bin_id to bin_id_from for location tracking
                bin_id_to,       -- Also populate bin_id_to to ensure it shows up correctly in Activity Log
                action,
                qty_before,
                qty_after,
                performed_by,
                notes
            ) VALUES (
                v_item.product_id,
                v_item.bin_id,
                v_item.bin_id,
                'count_adjust',
                v_item.system_qty,
                v_item.counted_qty,
                p_user_id,
                'Stock Count ID: ' || p_stock_count_id
            );

            -- 2. Update inventory (Note: using 'qty' instead of 'quantity' based on schema)
            UPDATE inventory 
            SET qty = v_item.counted_qty,
                updated_at = NOW(),
                updated_by = p_user_id
            WHERE product_id = v_item.product_id AND bin_id = v_item.bin_id;
            
        END IF;
    END LOOP;

    -- Update Stock Count Status
    UPDATE stock_counts
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_stock_count_id;

END;
$function$;
