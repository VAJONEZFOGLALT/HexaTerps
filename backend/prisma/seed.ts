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

async function main() {
  // Create canonical categories if they don't exist
  for (const name of CANONICAL_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (!existing) {
      await prisma.category.create({ data: { name } });
      console.log(`Created category: ${name}`);
    }
  }

  // Create base cannabinoids if they don't exist
  for (const name of BASE_CANNABINOIDS) {
    const existing = await prisma.cannabinoid.findUnique({ where: { name } });
    if (!existing) {
      await prisma.cannabinoid.create({ data: { name } });
      console.log(`Created cannabinoid: ${name}`);
    }
  }

  for (const name of BASE_DEVICES) {
    const existing = await prisma.device.findUnique({ where: { name } });
    if (!existing) {
      await prisma.device.create({ data: { name } });
      console.log(`Created device: ${name}`);
    }
  }

  console.log(
    `Seed complete: ${CANONICAL_CATEGORIES.length} categories, ${BASE_CANNABINOIDS.length} cannabinoids, and ${BASE_DEVICES.length} devices ready.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
