import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const CANONICAL_CATEGORIES = [
  'Limited blend',
  'Limited HHC blends',
  'BDT HHC blends',
  'Live Resin HHC blends',
  'D9/D9+Other cannabinoids blends',
  'Edibles',
  'Concentrates',
  'Equipment',
] as const;

const BASE_CANNABINOIDS = [
  'HHC',
  'Δ⁹-THC',
  'CBD',
  'CBG',
  'CBC',
  'CBN',
  'THCv',
  'THCa',
  'HHCP',
  'H4CBD',
  'PPB',
  'HP',
  'Terpenes',
];

const BASE_DEVICES = ['Cartridge', 'Small tank', 'Big tank', 'Disposable', 'Battery'];

export async function seedCanonicalData(client: PrismaClient = prisma) {
  // Create canonical categories if they don't exist
  for (const name of CANONICAL_CATEGORIES) {
    const existing = await client.category.findUnique({ where: { name } });
    if (!existing) {
      await client.category.create({ data: { name } });
      console.log(`Created category: ${name}`);
    }
  }

  // Create base cannabinoids if they don't exist
  for (const [position, name] of BASE_CANNABINOIDS.entries()) {
    const existing = await client.cannabinoid.findUnique({ where: { name } });
    if (!existing) {
      await client.cannabinoid.create({ data: { name, position } });
      console.log(`Created cannabinoid: ${name}`);
    } else if (existing.position !== position) {
      await client.cannabinoid.update({ where: { name }, data: { position } });
    }
  }

  for (const name of BASE_DEVICES) {
    const existing = await client.device.findUnique({ where: { name } });
    if (!existing) {
      await client.device.create({ data: { name } });
      console.log(`Created device: ${name}`);
    }
  }

  console.log(
    `Seed complete: ${CANONICAL_CATEGORIES.length} categories, ${BASE_CANNABINOIDS.length} cannabinoids, and ${BASE_DEVICES.length} devices ready.`,
  );
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedCanonicalData()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
