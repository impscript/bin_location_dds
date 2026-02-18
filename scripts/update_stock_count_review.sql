-- Drop first to allow return type change
DROP FUNCTION IF EXISTS get_stock_count_variance(UUID);

-- RPC to get variance report
CREATE OR REPLACE FUNCTION get_stock_count_variance(p_stock_count_id UUID)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    product_code TEXT,
    product_name TEXT,
    ns_code TEXT, -- Added
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
        p.ns_code, -- Added
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
