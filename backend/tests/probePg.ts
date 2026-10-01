import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('\n========================================================');
console.log('🔍 BRANDX REAL POSTGRESQL CONNECTION PROBE');
console.log('========================================================');
const rawUrl = process.env.DATABASE_URL || '';
const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ':****@');
console.log('Target DATABASE_URL:', maskedUrl);

export async function probePostgres() {
  const client = new PrismaClient({
    log: ['error'],
  });

  const startTime = Date.now();
  try {
    await client.$connect();
    const result: any = await client.$queryRaw`SELECT current_database(), current_user, version();`;
    const elapsed = Date.now() - startTime;
    console.log('\n✅ PostgreSQL Status: REACHABLE & CONNECTED');
    console.log(`⏱️ Connection latency: ${elapsed}ms`);
    console.log('📊 Connection details:', result);
    await client.$disconnect();
    return true;
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.log('\n❌ PostgreSQL Status: UNREACHABLE / OFFLINE');
    console.log(`⏱️ Connection failed after: ${elapsed}ms`);
    console.log('⚠️ Error code:', error.code || error.name || 'UNKNOWN');
    console.log('⚠️ Error message:', error.message?.split('\n').filter((l: string) => l.trim()).slice(0, 3).join(' '));
    await client.$disconnect();
    return false;
  }
}

if (process.argv[1]?.endsWith('probePg.ts')) {
  probePostgres().then((reachable) => {
    console.log('========================================================\n');
    process.exit(reachable ? 0 : 0);
  });
}
