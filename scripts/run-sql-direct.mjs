/**
 * Execute SQL migration script directly via PostgreSQL connection or Management API
 * Run: node scripts/run-sql-direct.mjs
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env
const envPath = resolve(__dirname, '..', '.env');
const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    }
});

const PROJECT_REF = 'pgbrkpcsodonzjbsztxu';
const DB_PASSWORD = env.DATABASE_PASSWORD || process.env.DATABASE_PASSWORD;
const DB_URL = env.DATABASE_URL || process.env.DATABASE_URL;
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;

async function run() {
    const sqlFile = resolve(__dirname, 'add_barcode_to_products.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    // 1. Try Management API if ACCESS_TOKEN is present
    if (ACCESS_TOKEN) {
        console.log('🚀 Executing SQL via Supabase Management API...');
        const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });
        if (res.ok) {
            console.log('✅ SQL Migration executed successfully via Management API!');
            return true;
        } else {
            console.log('❌ Management API error:', res.status, await res.text());
        }
    }

    // 2. Try direct PostgreSQL connection if DB_PASSWORD or DB_URL is present
    if (DB_PASSWORD || DB_URL) {
        console.log('🚀 Connecting to Supabase PostgreSQL database...');
        const client = DB_URL ? new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } }) : new Client({
            host: `db.${PROJECT_REF}.supabase.co`,
            port: 5432,
            user: 'postgres',
            password: DB_PASSWORD,
            database: 'postgres',
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log('   Connected to database! Executing SQL migration...');
            await client.query(sql);
            console.log('✅ SQL Migration executed successfully via PostgreSQL connection!');
            await client.end();
            return true;
        } catch (err) {
            console.error('❌ PostgreSQL connection error:', err.message);
            // Try pooler port 6543
            if (!DB_URL) {
                console.log('   Retrying via connection pooler (port 6543)...');
                const poolerClient = new Client({
                    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
                    port: 6543,
                    user: `postgres.${PROJECT_REF}`,
                    password: DB_PASSWORD,
                    database: 'postgres',
                    ssl: { rejectUnauthorized: false }
                });
                try {
                    await poolerClient.connect();
                    await poolerClient.query(sql);
                    console.log('✅ SQL Migration executed successfully via connection pooler!');
                    await poolerClient.end();
                    return true;
                } catch (e2) {
                    console.error('❌ Connection pooler error:', e2.message);
                }
            }
        }
    }

    console.log('\n⚠️ Could not execute automatically without Database Password or Access Token.');
    console.log('👉 Please add DATABASE_PASSWORD=your_password into .env');
    console.log('👉 OR run the SQL manually at: https://supabase.com/dashboard/project/pgbrkpcsodonzjbsztxu/sql/new');
    return false;
}

run().catch(console.error);
