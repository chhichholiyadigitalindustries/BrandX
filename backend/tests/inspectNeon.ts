import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Force IPv4 first to avoid hanging on networks where IPv6 drops port 5432
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look for .env.neon.test or process.env
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env.neon.test'),
  path.resolve(process.cwd(), 'backend/.env.neon.test'),
  path.resolve(__dirname, '../.env.neon.test'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

function sanitizeErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  const raw = typeof error === 'string' ? error : error?.message || String(error);
  return raw.replace(/postgres(ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgresql://***:***@');
}

export async function inspectNeonDatabase() {
  const neonUrl = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL)?.trim();

  if (!neonUrl || neonUrl === 'PASTE_NEON_CONNECTION_STRING_HERE') {
    console.error('❌ Neither NEON_DATABASE_URL nor DATABASE_URL is set.');
    process.exit(1);
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: neonUrl,
      },
    },
    log: ['error'],
  });

  try {
    await client.$connect();

    console.log('\n========================================================');
    console.log('🔍 BRANDX NEON DATABASE INSPECTION (READ-ONLY)');
    console.log('========================================================\n');

    // 0. Inspect all schemas in database
    const schemas: any[] = await client.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      ORDER BY schema_name;
    `;
    console.log(`🌐 Schemas in database: ${schemas.map((s) => s.schema_name).join(', ')}\n`);

    // 1. Inspect all tables and views in public schema
    const tables: any[] = await client.$queryRaw`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    const tableNames: string[] = tables.map((t) => `${t.table_name} (${t.table_type})`);
    console.log(`📊 Total public tables/views: ${tables.length}`);
    if (tables.length === 0) {
      console.log('   (No tables or views found in public schema)');
    } else {
      tables.forEach((t, idx) => {
        console.log(`   ${idx + 1}. ${t.table_name} [${t.table_type}]`);
      });
    }

    // 1b. Inspect custom ENUMs and types in public schema
    const customTypes: any[] = await client.$queryRaw`
      SELECT t.typname as type_name, t.typtype as type_kind
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname;
    `;
    console.log(`\n🏷️ Total custom types/enums in public schema: ${customTypes.length}`);
    if (customTypes.length > 0) {
      customTypes.forEach((t) => {
        console.log(`   - ${t.type_name} (kind: ${t.type_kind})`);
      });
    }

    // 1c. Inspect extensions in public schema
    const extensions: any[] = await client.$queryRaw`
      SELECT extname, extversion
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE n.nspname = 'public'
      ORDER BY extname;
    `;
    console.log(`\n🧩 Extensions in public schema: ${extensions.length}`);
    if (extensions.length > 0) {
      extensions.forEach((e) => {
        console.log(`   - ${e.extname} (v${e.extversion})`);
      });
    }

    // 1d. Inspect sequences in public schema
    const sequences: any[] = await client.$queryRaw`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name;
    `;
    console.log(`\n🔢 Sequences in public schema: ${sequences.length}`);
    if (sequences.length > 0) {
      sequences.forEach((s) => {
        console.log(`   - ${s.sequence_name}`);
      });
    }

    const rawTableNames: string[] = tables.map((t) => t.table_name);
    const hasPrismaMigrations = rawTableNames.includes('_prisma_migrations');
    console.log(`\n📦 _prisma_migrations table exists: ${hasPrismaMigrations ? 'YES' : 'NO'}`);

    if (hasPrismaMigrations) {
      const migrations: any[] = await client.$queryRaw`
        SELECT id, checksum, finished_at, migration_name, applied_steps_count, started_at, rolled_back_at
        FROM "_prisma_migrations"
        ORDER BY started_at;
      `;
      console.log(`📊 Migration records count: ${migrations.length}`);
      if (migrations.length > 0) {
        console.log('📑 Recorded migrations:');
        migrations.forEach((m) => {
          console.log(`   - ${m.migration_name} (Applied: ${m.applied_steps_count}, Finished: ${m.finished_at ? 'YES' : 'FAILED/IN-PROGRESS'}, Rolled back: ${m.rolled_back_at})`);
        });
      }
    } else {
      console.log('ℹ️ Migration records count: 0 (Table "_prisma_migrations" does not exist)');
    }

    // 3. Inspect row counts for any BrandX application tables found
    const keyAppTables = [
      'User',
      'Business',
      'Customer',
      'Product',
      'Invoice',
      'Wallet',
      'Referral',
      'KhataTransaction',
      'PaymentTransaction',
      'user',
      'business',
      'customer',
      'product',
      'invoice',
      'wallet'
    ];

    const presentKeyTables = tableNames.filter((t) => keyAppTables.includes(t));
    if (presentKeyTables.length > 0) {
      console.log('\n📈 Read-only row counts for application tables:');
      for (const tName of presentKeyTables) {
        try {
          const countRes: any[] = await client.$queryRawUnsafe(`SELECT count(*)::text as cnt FROM "${tName}";`);
          const count = countRes[0]?.cnt || '0';
          console.log(`   - "${tName}": ${count} rows`);
        } catch (e: any) {
          console.log(`   - "${tName}": Error querying count (${sanitizeErrorMessage(e)})`);
        }
      }
    }

    console.log('\n========================================================');
    console.log('✅ INSPECTION COMPLETE — NO DATA OR SCHEMA MODIFIED');
    console.log('========================================================\n');
  } catch (err: any) {
    console.error('❌ Inspection failed:', sanitizeErrorMessage(err));
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1]?.endsWith('inspectNeon.ts')) {
  inspectNeonDatabase();
}
