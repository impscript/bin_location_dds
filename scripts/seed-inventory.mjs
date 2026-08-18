/**
 * Seed script: parse csv/file update 18.8.26.xlsx and insert into Supabase
 * Run: node scripts/seed-inventory.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import xlsxPkg from 'xlsx';
const { readFile, utils } = xlsxPkg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://pgbrkpcsodonzjbsztxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYnJrcGNzb2RvbnpqYnN6dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjIyNDcsImV4cCI6MjA4NjQ5ODI0N30.8sKIh-xTX18vX48YG0aFZZXSpwMZs64ZbldWZHf6BnU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Zone definitions
const STANDARD_ZONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X'];
const SPECIAL_ZONES = ['DEMO', 'E-Com', 'OB_Consignment', 'OB_Cutsize', 'OB_Event', 'OB_Folio Full Pallet', 'OB_Folio Ream', 'OB_Premium', 'PKN_Damage (DS)', 'PKN_DeadStock (DS)', 'Print_CopyPointReam', 'Print_FastPrintReam'];
const ALL_ZONES = [...STANDARD_ZONES, ...SPECIAL_ZONES];

// Parse a Bin ID like "OB_Non A1-1" or "OB_Non X" into zone, shelf, level
function parseBinId(binId) {
    const cleaned = (binId || '').trim();

    // Check special zones
    for (const sz of SPECIAL_ZONES) {
        if (cleaned.includes(sz) || cleaned.replace(/[_ ]/g, '').includes(sz.replace(/[_ /]/g, ''))) {
            const afterZone = cleaned.substring(cleaned.indexOf(sz) + sz.length).trim();
            const shelfMatch = afterZone.match(/(\d+)/);
            return {
                zone: sz,
                shelf: shelfMatch ? `${sz} ${shelfMatch[1]}` : sz,
                level: 0
            };
        }
    }

    // Standard zones: "OB_Non A1-1" -> zone=A, shelf=A1, level=1
    const match = cleaned.match(/([A-Z])(\d+)-(\d+)/i);
    if (match) {
        return {
            zone: match[1].toUpperCase(),
            shelf: `${match[1].toUpperCase()}${match[2]}`,
            level: parseInt(match[3])
        };
    }

    // Single letter shelf/zone: "OB_Non X" -> zone=X, shelf=X, level=0
    const letterMatch = cleaned.match(/OB_Non\s+([A-Z])/i);
    if (letterMatch) {
        return {
            zone: letterMatch[1].toUpperCase(),
            shelf: letterMatch[1].toUpperCase(),
            level: 0
        };
    }

    // Fallback: split by space, first letter of last part
    const parts = cleaned.split(' ');
    const lastPart = parts[parts.length - 1] || cleaned;
    const firstChar = lastPart.charAt(0).toUpperCase();
    if (firstChar >= 'A' && firstChar <= 'Z') {
        return { zone: firstChar, shelf: lastPart, level: 0 };
    }

    return { zone: 'Unknown', shelf: cleaned, level: 0 };
}

async function seed() {
    console.log('🚀 Starting inventory seed process...');

    const excelPath = resolve(__dirname, '..', 'csv', 'file update 18.8.26.xlsx');
    if (!existsSync(excelPath)) {
        console.error(`❌ File not found: ${excelPath}`);
        return;
    }

    console.log(`📄 Reading Excel file: ${excelPath}`);
    const wb = readFile(excelPath);
    const sheetName = wb.SheetNames[0];
    const rawRows = utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    console.log(`   ✅ Read ${rawRows.length} rows from sheet "${sheetName}"`);

    // 1. Extract and Upsert Zones
    const zoneSet = new Set();
    rawRows.forEach(r => {
        const binId = String(r['Bin ID'] || '').trim();
        if (binId) {
            const { zone } = parseBinId(binId);
            zoneSet.add(zone);
        }
    });
    ALL_ZONES.forEach(z => zoneSet.add(z));

    const zones = [...zoneSet].map((name, i) => ({
        name,
        type: SPECIAL_ZONES.includes(name) ? 'special' : 'standard',
        sort_order: i
    }));

    console.log(`📍 Inserting/Upserting ${zones.length} zones...`);
    const { data: insertedZones, error: zoneErr } = await supabase
        .from('zones')
        .upsert(zones, { onConflict: 'name' })
        .select();
    if (zoneErr) {
        console.error('Zone error:', zoneErr);
        return;
    }
    console.log(`   ✅ ${insertedZones.length} zones confirmed`);

    const zoneLookup = {};
    insertedZones.forEach(z => { zoneLookup[z.name] = z.id; });

    // 2. Extract and Upsert Bins
    const binSet = new Map(); // bin_code -> { zone, shelf, level }
    rawRows.forEach(r => {
        const binId = String(r['Bin ID'] || '').trim();
        if (binId && !binSet.has(binId)) {
            binSet.set(binId, parseBinId(binId));
        }
    });

    const bins = [...binSet.entries()].map(([binCode, parsed]) => ({
        bin_code: binCode,
        zone_id: zoneLookup[parsed.zone] || zoneLookup['Unknown'] || insertedZones[0].id,
        shelf: parsed.shelf,
        level: parsed.level
    }));

    console.log(`📦 Inserting/Upserting ${bins.length} bins...`);
    const insertedBins = [];
    for (let i = 0; i < bins.length; i += 100) {
        const batch = bins.slice(i, i + 100);
        const { data, error } = await supabase
            .from('bins')
            .upsert(batch, { onConflict: 'bin_code' })
            .select();
        if (error) {
            console.error(`Bin batch ${i} error:`, error);
            return;
        }
        insertedBins.push(...data);
    }
    console.log(`   ✅ ${insertedBins.length} bins confirmed`);

    const binLookup = {};
    insertedBins.forEach(b => { binLookup[b.bin_code] = b.id; });

    // 3. Check if products table has 'barcode' column
    let supportsBarcode = false;
    try {
        const { error: testErr } = await supabase.from('products').select('barcode').limit(1);
        if (!testErr) {
            supportsBarcode = true;
            console.log('✨ products table supports barcode column directly!');
        } else {
            console.log('ℹ️ products table does not have barcode column yet. Will insert standard product fields.');
            console.log('   (Run scripts/add_barcode_to_products.sql in Supabase SQL editor to enable barcode column)');
        }
    } catch (e) {
        supportsBarcode = false;
    }

    // 4. Extract and Upsert Products (Primary key: NS Code)
    const productMap = new Map(); // ns_code -> product object
    const seenProdCodes = new Set();
    const barcodeRecordsMap = new Map();

    rawRows.forEach(r => {
        const nsCode = String(r['NS Code'] || '').trim();
        const rawProdCode = String(r['Product Code'] || '').trim();
        const prodName = String(r['Product Name'] || '').trim();
        const nsName = String(r['NS Name'] || '').trim() || prodName;
        const unit = String(r['Unit'] || '').trim() || 'EA';
        const nsSubGroup = String(r['NS SubGroup'] || '').trim();
        const barcode = String(r['BARCODE'] || '').trim();

        const primaryKey = nsCode || rawProdCode;
        if (!primaryKey) return;

        let finalProdCode = rawProdCode || nsCode;
        if (seenProdCodes.has(finalProdCode)) {
            finalProdCode = `${finalProdCode}-${nsCode}`;
        }
        seenProdCodes.add(finalProdCode);

        const prodObj = {
            ns_code: nsCode || finalProdCode,
            product_code: finalProdCode,
            product_name: prodName || nsName,
            ns_name: nsName,
            unit: unit,
            ns_sub_group: nsSubGroup || null,
        };

        if (supportsBarcode && barcode) {
            prodObj.barcode = barcode;
        }

        if (barcode && (rawProdCode || nsCode)) {
            barcodeRecordsMap.set(rawProdCode || nsCode, barcode);
        }

        productMap.set(primaryKey, prodObj);
    });

    const products = [...productMap.values()];
    console.log(`🏷️ Inserting/Upserting ${products.length} products...`);
    const insertedProducts = [];
    const prodBatchSize = 100;
    for (let i = 0; i < products.length; i += prodBatchSize) {
        const batch = products.slice(i, i + prodBatchSize);
        const { data, error } = await supabase
            .from('products')
            .upsert(batch, { onConflict: 'ns_code' })
            .select();
        if (error) {
            console.error(`Product batch ${i} error:`, error);
            // Fallback retry without barcode if column was missing
            if (supportsBarcode && error.message?.includes('barcode')) {
                supportsBarcode = false;
                const strippedBatch = batch.map(({ barcode, ...rest }) => rest);
                const { data: retryData, error: retryErr } = await supabase
                    .from('products')
                    .upsert(strippedBatch, { onConflict: 'ns_code' })
                    .select();
                if (retryErr) {
                    console.error(`Product batch ${i} retry error:`, retryErr);
                    return;
                }
                insertedProducts.push(...retryData);
            } else {
                return;
            }
        } else {
            insertedProducts.push(...data);
        }
        if ((i + prodBatchSize) % 1000 === 0 || i + prodBatchSize >= products.length) {
            console.log(`   ...processed ${Math.min(i + prodBatchSize, products.length)} / ${products.length} products`);
        }
    }
    console.log(`   ✅ ${insertedProducts.length} products inserted/updated`);

    // Build product lookup by ns_code
    const productLookup = {};
    insertedProducts.forEach(p => {
        if (p.ns_code) productLookup[p.ns_code] = p.id;
        if (p.product_code) productLookup[p.product_code] = p.id;
    });

    // 5. Seed Barcode Mappings table as legacy backup
    if (barcodeRecordsMap.size > 0) {
        console.log(`📊 Syncing ${barcodeRecordsMap.size} barcode records to barcode_mappings table...`);
        const barcodeRows = Array.from(barcodeRecordsMap.entries()).map(([prod_code, barcode]) => ({
            prod_code,
            barcode
        }));
        for (let i = 0; i < barcodeRows.length; i += 200) {
            const batch = barcodeRows.slice(i, i + 200);
            try {
                await supabase.from('barcode_mappings').upsert(batch, { onConflict: 'prod_code' });
            } catch (e) {
                // Ignore if unique constraint on barcode_mappings differs
            }
        }
        console.log(`   ✅ Barcode mappings synchronized`);
    }

    // 6. Create / Update Inventory Records
    const inventoryMap = new Map(); // key: "product_id|bin_id|lot_no" -> record
    rawRows.forEach(r => {
        const nsCode = String(r['NS Code'] || '').trim();
        const prodCode = String(r['Product Code'] || '').trim();
        const binCode = String(r['Bin ID'] || '').trim();
        const lotNo = String(r['Lot No'] || '').trim();
        const qty = parseInt(r['Quantity']) || 0;

        const productId = productLookup[nsCode] || productLookup[prodCode];
        const binId = binLookup[binCode];
        if (!productId || !binId) return;

        const key = `${productId}|${binId}|${lotNo}`;
        if (inventoryMap.has(key)) {
            inventoryMap.get(key).qty += qty;
        } else {
            inventoryMap.set(key, {
                product_id: productId,
                bin_id: binId,
                lot_no: lotNo || null,
                qty: qty
            });
        }
    });

    const inventory = [...inventoryMap.values()];
    console.log(`📊 Inserting ${inventory.length} deduplicated inventory records...`);
    let inventoryInserted = 0;
    const invBatchSize = 100;
    for (let i = 0; i < inventory.length; i += invBatchSize) {
        const batch = inventory.slice(i, i + invBatchSize);
        const { data, error } = await supabase
            .from('inventory')
            .insert(batch)
            .select();
        if (error) {
            console.error(`Inventory batch ${i} error:`, error);
        } else {
            inventoryInserted += (data || []).length;
        }
        if ((i + invBatchSize) % 1000 === 0 || i + invBatchSize >= inventory.length) {
            console.log(`   ...processed ${Math.min(i + invBatchSize, inventory.length)} / ${inventory.length} inventory records`);
        }
    }
    console.log(`   ✅ ${inventoryInserted} inventory records inserted/updated`);

    // Summary
    console.log('\n🎉 Inventory Seed completed successfully!');
    console.log(`   Zones: ${insertedZones.length}`);
    console.log(`   Bins: ${insertedBins.length}`);
    console.log(`   Products: ${insertedProducts.length}`);
    console.log(`   Inventory records: ${inventoryInserted}`);
}

seed().catch(console.error);
