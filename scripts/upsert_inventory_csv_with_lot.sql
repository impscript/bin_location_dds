-- Drop any existing versions
DROP FUNCTION IF EXISTS public.upsert_inventory_csv(text, uuid);
DROP FUNCTION IF EXISTS public.upsert_inventory_csv(jsonb, uuid);

-- Recreate with auto-create bins/zones and correct column names
-- Schema reference:
--   bins: id, bin_code, zone_id, shelf, level, is_active, created_at
--   products: id, product_code, product_name, unit, ns_code, ns_name, ns_sub_group, is_active, created_at, updated_at
--   inventory: id, product_id, bin_id, qty, updated_at, updated_by, lot_no
--   inventory_logs: id, product_id, bin_id_from, bin_id_to, action, qty_before, qty_after, performed_by, created_at, notes, lot_no

CREATE OR REPLACE FUNCTION public.upsert_inventory_csv(p_rows jsonb, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    row_data jsonb;
    v_product_id uuid;
    v_bin_id uuid;
    v_zone_id uuid;
    v_current_qty integer;
    v_new_qty integer;
    v_lot_no text;
    v_bin_code text;
    
    result jsonb := '{
        "products_created": 0,
        "products_updated": 0,
        "bins_created": 0,
        "inventory_updated": 0,
        "errors_count": 0
    }'::jsonb;
BEGIN
    -- Ensure a default zone exists for auto-created bins
    SELECT id INTO v_zone_id FROM zones WHERE name = 'Imported' LIMIT 1;
    IF v_zone_id IS NULL THEN
        INSERT INTO zones (name, type, sort_order) VALUES ('Imported', 'standard', 99)
        RETURNING id INTO v_zone_id;
    END IF;

    FOR row_data IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        BEGIN
            -- 1. Upsert Product
            SELECT id INTO v_product_id FROM products WHERE product_code = (row_data->>'product_code');
            
            IF v_product_id IS NULL THEN
                INSERT INTO products (
                    product_code, product_name, ns_code, ns_name, unit
                ) VALUES (
                    row_data->>'product_code',
                    row_data->>'product_name',
                    row_data->>'ns_code',
                    row_data->>'ns_name',
                    COALESCE(row_data->>'unit', 'EA')
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

            -- 2. Upsert Bin (auto-create under "Imported" zone if not exists)
            v_bin_code := TRIM(row_data->>'bin_code');
            IF v_bin_code IS NOT NULL AND v_bin_code != '' THEN
                SELECT id INTO v_bin_id FROM bins WHERE bin_code = v_bin_code;
                
                IF v_bin_id IS NULL THEN
                    INSERT INTO bins (bin_code, zone_id)
                    VALUES (v_bin_code, v_zone_id)
                    RETURNING id INTO v_bin_id;
                    
                    result := jsonb_set(result, '{bins_created}', (COALESCE((result->>'bins_created')::int, 0) + 1)::text::jsonb);
                END IF;

                -- 3. Upsert Inventory
                v_new_qty := COALESCE((row_data->>'qty')::integer, 0);
                v_lot_no := NULLIF(TRIM(row_data->>'lot_no'), '');
                
                IF v_lot_no IS NULL THEN
                    SELECT qty INTO v_current_qty FROM inventory 
                    WHERE product_id = v_product_id AND bin_id = v_bin_id AND (lot_no IS NULL OR lot_no = '');
                ELSE
                    SELECT qty INTO v_current_qty FROM inventory 
                    WHERE product_id = v_product_id AND bin_id = v_bin_id AND lot_no = v_lot_no;
                END IF;
                
                IF v_current_qty IS NULL THEN
                    INSERT INTO inventory (product_id, bin_id, lot_no, qty)
                    VALUES (v_product_id, v_bin_id, v_lot_no, v_new_qty);
                    
                    INSERT INTO inventory_logs (
                        product_id, action, bin_id_from, bin_id_to, qty_before, qty_after, lot_no, performed_by, notes
                    ) VALUES (
                        v_product_id, 'import', NULL, v_bin_id, 0, v_new_qty, v_lot_no, p_user_id, 'CSV Import'
                    );
                ELSIF v_current_qty != v_new_qty THEN
                    IF v_lot_no IS NULL THEN
                        UPDATE inventory SET qty = v_new_qty, updated_at = NOW()
                        WHERE product_id = v_product_id AND bin_id = v_bin_id AND (lot_no IS NULL OR lot_no = '');
                    ELSE
                        UPDATE inventory SET qty = v_new_qty, updated_at = NOW()
                        WHERE product_id = v_product_id AND bin_id = v_bin_id AND lot_no = v_lot_no;
                    END IF;
                    
                    INSERT INTO inventory_logs (
                        product_id, action, bin_id_from, bin_id_to, qty_before, qty_after, lot_no, performed_by, notes
                    ) VALUES (
                        v_product_id, 'adjust', NULL, v_bin_id, v_current_qty, v_new_qty, v_lot_no, p_user_id, 'CSV Import Adjustment'
                    );
                END IF;
                
                result := jsonb_set(result, '{inventory_updated}', (COALESCE((result->>'inventory_updated')::int, 0) + 1)::text::jsonb);
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error processing row %: %', row_data, SQLERRM;
            result := jsonb_set(result, '{errors_count}', (COALESCE((result->>'errors_count')::int, 0) + 1)::text::jsonb);
        END;
    END LOOP;

    RETURN result;
END;
$function$;
