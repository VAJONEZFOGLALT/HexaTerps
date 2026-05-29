import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({ include: { products: true }, orderBy: { id: 'asc' } });
  console.log(`Categories (${cats.length}):`);
  for (const c of cats) {
    console.log(`- ${c.id}: ${c.name} (products: ${c.products.length})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
