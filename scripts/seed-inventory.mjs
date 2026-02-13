/**
 * Seed script: parse template_final.csv and insert into Supabase
 * Run: node scripts/seed-inventory.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://pgbrkpcsodonzjbsztxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYnJrcGNzb2RvbnpqYnN6dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjIyNDcsImV4cCI6MjA4NjQ5ODI0N30.8sKIh-xTX18vX48YG0aFZZXSpwMZs64ZbldWZHf6BnU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Zone definitions from constants.js
const STANDARD_ZONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const SPECIAL_ZONES = ['Cutsize', 'Premium', 'Photocopy', 'Inkjet', 'Sample/Damage'];
const ALL_ZONES = [...STANDARD_ZONES, ...SPECIAL_ZONES];

// Parse a Bin ID like "OB_Non A1-1" into zone, shelf, level
function parseBinId(binId) {
    const cleaned = binId.trim();

    // Check special zones
    for (const sz of SPECIAL_ZONES) {
        if (cleaned.includes(sz) || cleaned.replace(/[_ ]/g, '').includes(sz.replace(/[_ /]/g, ''))) {
            // Try to extract shelf number if present
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
    const match = cleaned.match(/([A-I])(\d+)-(\d+)/);
    if (match) {
        return {
            zone: match[1],
            shelf: `${match[1]}${match[2]}`,
            level: parseInt(match[3])
        };
    }

    // Fallback
    return { zone: 'Unknown', shelf: cleaned, level: 0 };
}

// Parse CSV (handles quoted fields)
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            rows.push(row);
        }
    }
    return rows;
}

async function seed() {
    console.log('🚀 Starting seed process...');

    // 1. Read and parse CSV
    const csvPath = resolve(__dirname, '..', 'template_final.csv');
    const csvText = readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvText);
    console.log(`📄 Parsed ${rows.length} rows from CSV`);

    // 2. Extract unique zones
    const zoneSet = new Set();
    rows.forEach(r => {
        const { zone } = parseBinId(r['Bin ID']);
        zoneSet.add(zone);
    });
    // Also add all predefined zones
    ALL_ZONES.forEach(z => zoneSet.add(z));

    const zones = [...zoneSet].map((name, i) => ({
        name,
        type: SPECIAL_ZONES.includes(name) ? 'special' : 'standard',
        sort_order: i
    }));

    console.log(`📍 Inserting ${zones.length} zones...`);
    const { data: insertedZones, error: zoneErr } = await supabase
        .from('zones')
        .upsert(zones, { onConflict: 'name' })
        .select();
    if (zoneErr) { console.error('Zone error:', zoneErr); return; }
    console.log(`   ✅ ${insertedZones.length} zones inserted`);

    // Build zone lookup
    const zoneLookup = {};
    insertedZones.forEach(z => { zoneLookup[z.name] = z.id; });

    // 3. Extract unique bins
    const binSet = new Map(); // bin_code -> { zone, shelf, level }
    rows.forEach(r => {
        const binId = r['Bin ID'].trim();
        if (!binSet.has(binId)) {
            binSet.set(binId, parseBinId(binId));
        }
    });

    const bins = [...binSet.entries()].map(([binCode, parsed]) => ({
        bin_code: binCode,
        zone_id: zoneLookup[parsed.zone],
        shelf: parsed.shelf,
        level: parsed.level
    }));

    console.log(`📦 Inserting ${bins.length} bins...`);
    // Insert in batches of 100
    const insertedBins = [];
    for (let i = 0; i < bins.length; i += 100) {
        const batch = bins.slice(i, i + 100);
        const { data, error } = await supabase
            .from('bins')
            .upsert(batch, { onConflict: 'bin_code' })
            .select();
        if (error) { console.error(`Bin batch ${i} error:`, error); return; }
        insertedBins.push(...data);
    }
    console.log(`   ✅ ${insertedBins.length} bins inserted`);

    // Build bin lookup
    const binLookup = {};
    insertedBins.forEach(b => { binLookup[b.bin_code] = b.id; });

    // 4. Extract unique products (by ns_code)
    const productMap = new Map(); // ns_code -> product data
    rows.forEach(r => {
        const nsCode = r['NS Code'].trim();
        if (nsCode && !productMap.has(nsCode)) {
            productMap.set(nsCode, {
                product_code: r['Product Code'].trim(),
                product_name: r['Product Name'].trim(),
                unit: r['Unit'].trim() || 'EA',
                ns_code: nsCode,
                ns_name: r['NS Name'].trim(),
                ns_sub_group: r['NS SubGroup'].trim()
            });
        }
    });

    const products = [...productMap.values()];
    console.log(`🏷️  Inserting ${products.length} products...`);
    const insertedProducts = [];
    for (let i = 0; i < products.length; i += 100) {
        const batch = products.slice(i, i + 100);
        const { data, error } = await supabase
            .from('products')
            .upsert(batch, { onConflict: 'ns_code' })
            .select();
        if (error) { console.error(`Product batch ${i} error:`, error); return; }
        insertedProducts.push(...data);
    }
    console.log(`   ✅ ${insertedProducts.length} products inserted`);

    // Build product lookup by ns_code
    const productLookup = {};
    insertedProducts.forEach(p => { productLookup[p.ns_code] = p.id; });

    // 5. Create inventory records — deduplicate by (product_id, bin_id)
    const inventoryMap = new Map(); // key: "product_id|bin_id" -> { product_id, bin_id, qty }
    rows.forEach(r => {
        const nsCode = r['NS Code'].trim();
        const binCode = r['Bin ID'].trim();
        if (!nsCode || !binCode) return;
        const productId = productLookup[nsCode];
        const binId = binLookup[binCode];
        if (!productId || !binId) return;

        const key = `${productId}|${binId}`;
        if (inventoryMap.has(key)) {
            // Sum quantities for duplicate product-bin pairs
            inventoryMap.get(key).qty += parseInt(r['Quantity']) || 0;
        } else {
            inventoryMap.set(key, {
                product_id: productId,
                bin_id: binId,
                qty: parseInt(r['Quantity']) || 0
            });
        }
    });

    const inventory = [...inventoryMap.values()];
    console.log(`📊 Inserting ${inventory.length} deduplicated inventory records...`);
    let inventoryInserted = 0;
    for (let i = 0; i < inventory.length; i += 50) {
        const batch = inventory.slice(i, i + 50);
        const { data, error } = await supabase
            .from('inventory')
            .upsert(batch, { onConflict: 'product_id,bin_id' })
            .select();
        if (error) { console.error(`Inventory batch ${i} error:`, error); }
        else inventoryInserted += data.length;
    }
    console.log(`   ✅ ${inventoryInserted} inventory records inserted`);

    // Summary
    console.log('\n🎉 Seed completed!');
    console.log(`   Zones: ${insertedZones.length}`);
    console.log(`   Bins: ${insertedBins.length}`);
    console.log(`   Products: ${insertedProducts.length}`);
    console.log(`   Inventory: ${inventoryInserted}`);
}

seed().catch(console.error);
