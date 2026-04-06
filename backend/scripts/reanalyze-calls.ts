import path from 'path';
import { PrismaClient } from '@prisma/client';
import telecallerCallFinalizationService from '../src/services/telecaller-call-finalization.service';

const prisma = new PrismaClient();

async function main() {
  const calls = await prisma.telecallerCall.findMany({
    where: { recordingUrl: { not: null } },
    select: { id: true, recordingUrl: true, aiAnalyzed: true },
  });
  console.log(`Found ${calls.length} calls with recordings`);
  for (const c of calls) {
    const rel = c.recordingUrl!.replace(/^\//, '');
    const abs = path.join(process.cwd(), rel);
    console.log(`\n>>> Processing ${c.id}  (aiAnalyzed=${c.aiAnalyzed})\n    file: ${abs}`);
    try {
      await telecallerCallFinalizationService.processRecording(c.id, abs);
      console.log(`    ✅ done`);
    } catch (e: any) {
      console.error(`    ❌ failed:`, e?.message || e);
    }
  }
}

main().finally(() => prisma.$disconnect());
