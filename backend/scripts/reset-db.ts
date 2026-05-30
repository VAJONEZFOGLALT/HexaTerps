import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { seedCanonicalData } from '../prisma/seed';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Resetting database...');
  
  // Delete all data in reverse order of dependencies
  await prisma.productDevice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productCannabinoid.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.cannabinoid.deleteMany();
  await prisma.device.deleteMany();

  await seedCanonicalData(prisma);

  console.log('✅ Database cleared. Tables remain intact.');
  console.log('Ready for manual data entry.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
