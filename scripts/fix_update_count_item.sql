CREATE OR REPLACE FUNCTION public.update_count_item(p_item_id uuid, p_counted_qty integer, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_system_qty int;
    v_stock_count_zone_id uuid;
BEGIN
    -- Get current system qty and zone id
    SELECT system_qty, stock_count_zone_id 
    INTO v_system_qty, v_stock_count_zone_id
    FROM stock_count_items
    WHERE id = p_item_id;

    -- Update Item
    -- REMOVED 'variance' update because it is a GENERATED column
    UPDATE stock_count_items
    SET counted_qty = p_counted_qty,
        status = 'counted',
        counted_by = p_user_id,
        counted_at = now()
    WHERE id = p_item_id;

    -- Update Zone Progress
    UPDATE stock_count_zones
    SET counted_items = (
        SELECT count(*) 
        FROM stock_count_items 
        WHERE stock_count_zone_id = v_stock_count_zone_id 
        AND status = 'counted'
    )
    WHERE id = v_stock_count_zone_id;
END;
$function$
