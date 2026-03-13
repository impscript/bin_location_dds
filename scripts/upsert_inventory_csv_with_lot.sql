-- Fix ambiguous function definitions by dropping both potential signatures
DROP FUNCTION IF EXISTS public.upsert_inventory_csv(text, uuid);
DROP FUNCTION IF EXISTS public.upsert_inventory_csv(jsonb, uuid);

-- Recreate the correct JSONB version
CREATE OR REPLACE FUNCTION public.upsert_inventory_csv(p_rows jsonb, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    row_data jsonb;
    v_product_id uuid;
    v_bin_id uuid;
    v_current_qty integer;
    v_new_qty integer;
    v_lot_no text;
    
    result jsonb := '{
        "products_created": 0,
        "products_updated": 0,
        "bins_created": 0,
        "inventory_updated": 0,
        "errors_count": 0
    }'::jsonb;
BEGIN
    FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        BEGIN
            -- 1. Upsert Product
            SELECT id INTO v_product_id FROM products WHERE product_code = (row_data->>'product_code');
            
            IF v_product_id IS NULL THEN
                INSERT INTO products (
                    product_code, product_name, ns_code, ns_name, unit, created_by
                ) VALUES (
                    row_data->>'product_code',
                    row_data->>'product_name',
                    row_data->>'ns_code',
                    row_data->>'ns_name',
                    COALESCE(row_data->>'unit', 'EA'),
                    p_user_id
                ) RETURNING id INTO v_product_id;
                
                result := jsonb_set(result, '{products_created}', (COALESCE((result->>'products_created')::int, 0) + 1)::text::jsonb);
            ELSE
                UPDATE products SET
                    product_name = COALESCE(NULLIF(row_data->>'product_name', ''), product_name),
                    ns_code = COALESCE(NULLIF(row_data->>'ns_code', ''), ns_code),
                    ns_name = COALESCE(NULLIF(row_data->>'ns_name', ''), ns_name),
                    unit = COALESCE(NULLIF(row_data->>'unit', ''), unit)
                WHERE id = v_product_id;
                
                result := jsonb_set(result, '{products_updated}', (COALESCE((result->>'products_updated')::int, 0) + 1)::text::jsonb);
            END IF;

            -- 2. Upsert Bin
            IF row_data->>'bin_code' IS NOT NULL AND row_data->>'bin_code' != '' THEN
                SELECT id INTO v_bin_id FROM bins WHERE code = (row_data->>'bin_code');
                
                IF v_bin_id IS NULL THEN
                    INSERT INTO bins (code, name, created_by)
                    VALUES (row_data->>'bin_code', row_data->>'bin_code', p_user_id)
                    RETURNING id INTO v_bin_id;
                    
                    result := jsonb_set(result, '{bins_created}', (COALESCE((result->>'bins_created')::int, 0) + 1)::text::jsonb);
                END IF;

                -- 3. Upsert Inventory with Lot No
                v_new_qty := COALESCE((row_data->>'qty')::integer, 0);
                v_lot_no := NULLIF(TRIM(row_data->>'lot_no'), '');
                
                -- Check if inventory record exists for this product + bin + lot combination
                IF v_lot_no IS NULL THEN
                    -- Look for a record without a lot number
                    SELECT quantity INTO v_current_qty FROM inventory 
                    WHERE product_id = v_product_id AND bin_id = v_bin_id AND (lot_no IS NULL OR lot_no = '');
                ELSE
                    -- Look for a record with the specific lot number
                    SELECT quantity INTO v_current_qty FROM inventory 
                    WHERE product_id = v_product_id AND bin_id = v_bin_id AND lot_no = v_lot_no;
                END IF;
                
                IF v_current_qty IS NULL THEN
                    -- Insert new inventory record
                    INSERT INTO inventory (product_id, bin_id, lot_no, quantity)
                    VALUES (v_product_id, v_bin_id, v_lot_no, v_new_qty);
                    
                    -- Record transaction
                    INSERT INTO inventory_transactions (
                        product_id, bin_id, lot_no, transaction_type, quantity, reference_type, created_by
                    ) VALUES (
                        v_product_id, v_bin_id, v_lot_no, 'IN', v_new_qty, 'IMPORT', p_user_id
                    );
                ELSIF v_current_qty != v_new_qty THEN
                    -- Update existing inventory record
                    IF v_lot_no IS NULL THEN
                        UPDATE inventory SET quantity = v_new_qty, updated_at = NOW()
                        WHERE product_id = v_product_id AND bin_id = v_bin_id AND (lot_no IS NULL OR lot_no = '');
                    ELSE
                        UPDATE inventory SET quantity = v_new_qty, updated_at = NOW()
                        WHERE product_id = v_product_id AND bin_id = v_bin_id AND lot_no = v_lot_no;
                    END IF;
                    
                    -- Record transaction for the difference
                    INSERT INTO inventory_transactions (
                        product_id, bin_id, lot_no, transaction_type, quantity, reference_type, created_by
                    ) VALUES (
                        v_product_id, v_bin_id, v_lot_no, 
                        CASE WHEN v_new_qty > v_current_qty THEN 'IN' ELSE 'OUT' END, 
                        ABS(v_new_qty - v_current_qty), 
                        'IMPORT_ADJUSTMENT', p_user_id
                    );
                END IF;
                
                result := jsonb_set(result, '{inventory_updated}', (COALESCE((result->>'inventory_updated')::int, 0) + 1)::text::jsonb);
            END IF;

        EXCEPTION WHEN OTHERS THEN
            -- Log error and continue with next row
            RAISE WARNING 'Error processing row %: %', row_data, SQLERRM;
            result := jsonb_set(result, '{errors_count}', (COALESCE((result->>'errors_count')::int, 0) + 1)::text::jsonb);
        END;
    END LOOP;

    RETURN result;
END;
$function$;
