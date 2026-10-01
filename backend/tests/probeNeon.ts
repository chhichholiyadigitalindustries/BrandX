import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Force IPv4 first to avoid hanging on networks where IPv6 to AWS/Neon drops port 5432
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look strictly for .env.neon.test without modifying or reading default .env
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

/**
 * Sanitizes errors to ensure credentials, passwords, or connection URLs are never printed.
 */
function sanitizeErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred during connection';
  const raw = typeof error === 'string' ? error : error?.message || String(error);
  return raw.replace(/postgres(ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgresql://***:***@');
}

export async function probeNeonConnection(): Promise<boolean> {
  const neonUrl = process.env.NEON_DATABASE_URL?.trim();

  console.log('\n========================================================');
  console.log('🔍 BRANDX NEON POSTGRESQL CONNECTIVITY PROBE (SAFE MODE)');
  console.log('========================================================');

  if (!neonUrl || neonUrl === 'PASTE_NEON_CONNECTION_STRING_HERE') {
    console.log('⚠️  NEON_DATABASE_URL is not set or still contains the placeholder.');
    console.log('👉 Please paste your actual Neon connection string into:');
    console.log('   backend/.env.neon.test');
    console.log('   (File is gitignored and will not be committed)');
    console.log('========================================================\n');
    return false;
  }

  if (!neonUrl.startsWith('postgresql://') && !neonUrl.startsWith('postgres://')) {
    console.log('❌ Invalid connection string format. URL must start with postgresql:// or postgres://');
    console.log('========================================================\n');
    return false;
  }

  // Create isolated PrismaClient bound exclusively to NEON_DATABASE_URL
  // Local DATABASE_URL is never read, overwritten, or modified.
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
    const rows: any = await client.$queryRaw`SELECT current_database(), current_user, version();`;
    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!record) {
      throw new Error('Query succeeded but returned empty result set');
    }

    console.log('Neon PostgreSQL connection: SUCCESS');
    console.log(`Database: ${record.current_database || 'neondb'}`);
    console.log(`User: ${record.current_user || 'neondb_owner'}`);
    console.log('SSL/connection: successful');
    console.log('========================================================\n');
    return true;
  } catch (err: any) {
    console.log('Neon PostgreSQL connection: FAILED');
    console.log(`Error: ${sanitizeErrorMessage(err)}`);
    console.log('========================================================\n');
    return false;
  } finally {
    await client.$disconnect();
  }
}

// Execute directly if run via CLI / tsx
if (process.argv[1]?.endsWith('probeNeon.ts')) {
  probeNeonConnection().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
