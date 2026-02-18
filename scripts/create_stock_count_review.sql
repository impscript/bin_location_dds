-- RPC to get variance report
CREATE OR REPLACE FUNCTION get_stock_count_variance(p_stock_count_id UUID)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    product_code TEXT,
    product_name TEXT,
    bin_code TEXT,
    system_qty INTEGER,
    counted_qty INTEGER,
    variance INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sci.id,
        sci.product_id,
        p.product_code,
        p.product_name,
        b.bin_code,
        sci.system_qty,
        sci.counted_qty,
        (sci.counted_qty - sci.system_qty) as variance,
        sci.status
    FROM stock_count_items sci
    JOIN products p ON sci.product_id = p.id
    JOIN bins b ON sci.bin_id = b.id
    WHERE sci.stock_count_id = p_stock_count_id
    AND (sci.counted_qty <> sci.system_qty OR sci.status <> 'counted')
    ORDER BY b.bin_code, p.product_code;
END;
$$ LANGUAGE plpgsql;

-- RPC to complete stock count and adjust inventory
CREATE OR REPLACE FUNCTION complete_stock_count(p_stock_count_id UUID, p_user_id UUID)
RETURNS VOID AS $$
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
            -- 1. Create movement log
            INSERT INTO inventory_movements (
                product_id, 
                bin_id, 
                qty_change, 
                movement_type, 
                reference_id, 
                created_by
            ) VALUES (
                v_item.product_id,
                v_item.bin_id,
                v_adjustment_qty,
                'adjustment',
                p_stock_count_id, -- Use stock count ID as reference
                p_user_id
            );

            -- 2. Update inventory (Upsert logic to handle potential concurrent changes or if row missing - though snapshot implies it exists)
            -- However, usually we just update the specific inventory record.
            -- Since we snapshot from inventory table, we assume the row exists.
            UPDATE inventory 
            SET quantity = quantity + v_adjustment_qty,
                updated_at = NOW()
            WHERE product_id = v_item.product_id AND bin_id = v_item.bin_id;
            
            -- If row doesn't exist (e.g. was deleted or new item found?), we might need INSERT.
            -- But for now let's assume standard flow where snapshot items exist.
            -- If we implement "Add New Item during count" later, we need INSERT here.
        END IF;
    END LOOP;

    -- Update Stock Count Status
    UPDATE stock_counts
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = p_user_id
    WHERE id = p_stock_count_id;

END;
$$ LANGUAGE plpgsql;
