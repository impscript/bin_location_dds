/**
 * Seed script: parse csv/BARCODE_Map_DB.csv and insert into Supabase
 * Run: node scripts/seed-barcodes.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://pgbrkpcsodonzjbsztxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYnJrcGNzb2RvbnpqYnN6dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjIyNDcsImV4cCI6MjA4NjQ5ODI0N30.8sKIh-xTX18vX48YG0aFZZXSpwMZs64ZbldWZHf6BnU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simple CSV Parser (handling potential quotes)
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
    console.log('🚀 Starting barcode seed process...');

    // 1. Read and parse CSV
    const csvPath = resolve(__dirname, '..', 'csv', 'BARCODE_Map_DB.csv');
    const csvText = readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvText);
    console.log(`📄 Parsed ${rows.length} rows from CSV`);

    // Deduplicate mappings by prod_code (keeping the last one)
    const uniqueMappingsMap = new Map();
    rows.forEach(r => {
        const prodCodeKey = Object.keys(r).find(k => k.toUpperCase().trim() === 'PRODCODE');
        const barcodeKey = Object.keys(r).find(k => k.toUpperCase().trim() === 'BARCODE');
        
        if (prodCodeKey && barcodeKey) {
            const prod_code = (r[prodCodeKey] || '').trim();
            const barcode = (r[barcodeKey] || '').trim();
            if (prod_code && barcode) {
                uniqueMappingsMap.set(prod_code, barcode);
            }
        }
    });

    const mappings = Array.from(uniqueMappingsMap.entries()).map(([prod_code, barcode]) => ({
        prod_code,
        barcode
    }));

    console.log(`🏷️ Inserting/Upserting ${mappings.length} unique barcode mappings...`);

    // Insert in batches of 500
    let insertedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < mappings.length; i += batchSize) {
        const batch = mappings.slice(i, i + batchSize);
        const { error } = await supabase
            .from('barcode_mappings')
            .upsert(batch, { onConflict: 'prod_code' });

        if (error) {
            console.error(`❌ Batch starting at index ${i} failed:`, error.message);
            console.log('Ensure you have executed the migration script scripts/create_barcode_mappings.sql in Supabase Dashboard SQL Editor.');
            return;
        }
        insertedCount += batch.length;
        console.log(`   ✅ ${insertedCount} mappings processed...`);
    }

    console.log('\n🎉 Barcode seeding completed successfully!');
}

seed().catch(console.error);
