/**
 * Backfill barcode column on products table from csv/file update 18.8.26.xlsx
 * Run: node scripts/update-products-barcode.mjs
 */
import { createClient } from '@supabase/supabase-js';
import xlsxPkg from 'xlsx';
const { readFile, utils } = xlsxPkg;
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = 'https://pgbrkpcsodonzjbsztxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYnJrcGNzb2RvbnpqYnN6dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjIyNDcsImV4cCI6MjA4NjQ5ODI0N30.8sKIh-xTX18vX48YG0aFZZXSpwMZs64ZbldWZHf6BnU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function backfillBarcodes() {
    console.log('🔍 Checking if products table has barcode column...');
    const { error: testErr } = await supabase.from('products').select('barcode').limit(1);
    if (testErr) {
        console.log('⚠️ barcode column not yet added to products table.');
        console.log('👉 Please run scripts/add_barcode_to_products.sql in Supabase SQL Editor first.');
        return;
    }

    console.log('✅ barcode column found on products table!');
    console.log('📄 Reading Excel file...');
    const excelPath = resolve(__dirname, '..', 'csv', 'file update 18.8.26.xlsx');
    const wb = readFile(excelPath);
    const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    console.log(`🏷️ Updating barcodes for ${data.length} products...`);
    const barcodeMap = new Map();
    data.forEach(r => {
        const nsCode = String(r['NS Code'] || '').trim();
        const barcode = String(r['BARCODE'] || '').trim();
        if (nsCode && barcode) {
            barcodeMap.set(nsCode, barcode);
        }
    });

    console.log(`Found ${barcodeMap.size} products with barcodes to update.`);
    let updated = 0;
    const entries = Array.from(barcodeMap.entries());
    for (let i = 0; i < entries.length; i += 100) {
        const batch = entries.slice(i, i + 100);
        await Promise.all(
            batch.map(([ns_code, barcode]) =>
                supabase.from('products').update({ barcode }).eq('ns_code', ns_code)
            )
        );
        updated += batch.length;
        if (updated % 500 === 0 || updated >= entries.length) {
            console.log(`   ...updated ${updated} / ${entries.length} barcodes`);
        }
    }
    console.log(`🎉 Successfully updated ${updated} barcodes directly in products master table!`);
}

backfillBarcodes().catch(console.error);
