-- ============================================================
-- Migration: Add barcode column to products table & update RPCs
-- ============================================================

-- 1. Add barcode column to products table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'products' 
          AND column_name = 'barcode'
    ) THEN
        ALTER TABLE public.products ADD COLUMN barcode text;
        RAISE NOTICE 'Added barcode to products table';
    ELSE
        RAISE NOTICE 'barcode already exists on products table';
    END IF;
END $$;

-- 2. Allow product_code to be NULL and non-unique (NS Code is now primary identifier)
DO $$
BEGIN
    ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_product_code_key;
    ALTER TABLE public.products ALTER COLUMN product_code DROP NOT NULL;
    RAISE NOTICE 'Updated products table: product_code is now nullable and non-unique';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not modify product_code constraint: %', SQLERRM;
END $$;

-- 3. Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_ns_code ON public.products(ns_code);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON public.products(product_code);

-- 3. Update upsert_inventory_csv function to handle ns_code (primary), product_code, and barcode
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
    v_zone_name text;
    v_parts text[];
    v_ns_code text;
    v_prod_code text;
    v_barcode text;
    
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
            v_ns_code := NULLIF(TRIM(row_data->>'ns_code'), '');
            v_prod_code := NULLIF(TRIM(row_data->>'product_code'), '');
            v_barcode := NULLIF(TRIM(row_data->>'barcode'), '');

            -- 1. Upsert Product (Match by NS Code first, fallback to Product Code)
            v_product_id := NULL;
            IF v_ns_code IS NOT NULL THEN
                SELECT id INTO v_product_id FROM products WHERE ns_code = v_ns_code LIMIT 1;
            END IF;
            
            IF v_product_id IS NULL AND v_prod_code IS NOT NULL THEN
                SELECT id INTO v_product_id FROM products WHERE product_code = v_prod_code LIMIT 1;
            END IF;
            
            IF v_product_id IS NULL THEN
                INSERT INTO products (
                    ns_code, product_code, product_name, ns_name, ns_sub_group, unit, barcode
                ) VALUES (
                    COALESCE(v_ns_code, v_prod_code),
                    v_prod_code,
                    COALESCE(NULLIF(row_data->>'product_name', ''), NULLIF(row_data->>'ns_name', ''), 'Unknown Product'),
                    COALESCE(NULLIF(row_data->>'ns_name', ''), NULLIF(row_data->>'product_name', ''), 'Unknown Product'),
                    NULLIF(row_data->>'ns_sub_group', ''),
                    COALESCE(NULLIF(row_data->>'unit', ''), 'EA'),
                    v_barcode
                ) RETURNING id INTO v_product_id;
                
                result := jsonb_set(result, '{products_created}', (COALESCE((result->>'products_created')::int, 0) + 1)::text::jsonb);
            ELSE
                UPDATE products SET
                    product_code = COALESCE(v_prod_code, product_code),
                    product_name = COALESCE(NULLIF(row_data->>'product_name', ''), product_name),
                    ns_code = COALESCE(v_ns_code, ns_code),
                    ns_name = COALESCE(NULLIF(row_data->>'ns_name', ''), ns_name),
                    ns_sub_group = COALESCE(NULLIF(row_data->>'ns_sub_group', ''), ns_sub_group),
                    unit = COALESCE(NULLIF(row_data->>'unit', ''), unit),
                    barcode = COALESCE(v_barcode, barcode),
                    updated_at = NOW()
                WHERE id = v_product_id;
                
                result := jsonb_set(result, '{products_updated}', (COALESCE((result->>'products_updated')::int, 0) + 1)::text::jsonb);
            END IF;

            -- 2. Upsert Bin (auto-create if not exists, parse zone from bin_code)
            v_bin_code := TRIM(row_data->>'bin_code');
            IF v_bin_code IS NOT NULL AND v_bin_code != '' THEN
                SELECT id INTO v_bin_id FROM bins WHERE bin_code = v_bin_code LIMIT 1;
                
                IF v_bin_id IS NULL THEN
                    v_parts := string_to_array(v_bin_code, ' ');
                    IF array_length(v_parts, 1) > 1 THEN
                        v_zone_name := LEFT(v_parts[array_length(v_parts, 1)], 1);
                    ELSE
                        v_zone_name := LEFT(v_bin_code, 1);
                    END IF;
                    v_zone_name := UPPER(v_zone_name);
                    
                    -- Find or create the zone
                    SELECT id INTO v_zone_id FROM zones WHERE UPPER(name) = v_zone_name LIMIT 1;
                    IF v_zone_id IS NULL THEN
                        INSERT INTO zones (name, type, sort_order) 
                        VALUES (v_zone_name, 'standard', ASCII(v_zone_name) - 64)
                        RETURNING id INTO v_zone_id;
                    END IF;
                    
                    -- Create bin with shelf = last part of bin_code
                    INSERT INTO bins (bin_code, zone_id, shelf)
                    VALUES (v_bin_code, v_zone_id, v_parts[array_length(v_parts, 1)])
                    RETURNING id INTO v_bin_id;
                    
                    result := jsonb_set(result, '{bins_created}', (COALESCE((result->>'bins_created')::int, 0) + 1)::text::jsonb);
                END IF;

                -- 3. Upsert Inventory
                v_new_qty := COALESCE((row_data->>'qty')::integer, 0);
                v_lot_no := NULLIF(TRIM(row_data->>'lot_no'), '');
                
                IF v_lot_no IS NULL THEN
                    SELECT qty INTO v_current_qty FROM inventory 
                    WHERE product_id = v_product_id AND bin_id = v_bin_id AND (lot_no IS NULL OR lot_no = '')
                    LIMIT 1;
                ELSE
                    SELECT qty INTO v_current_qty FROM inventory 
                    WHERE product_id = v_product_id AND bin_id = v_bin_id AND lot_no = v_lot_no
                    LIMIT 1;
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
