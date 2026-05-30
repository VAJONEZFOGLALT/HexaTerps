import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const badNames = await prisma.product.findMany({
    where: { name: { contains: 'terpen' } },
    select: { id: true, name: true, category: { select: { name: true } } },
  });
  console.log('badNames', badNames.length);
  badNames.forEach((p) => console.log(p.id, p.name, p.category.name));

  const cats = await prisma.category.findMany({ orderBy: { id: 'asc' }, include: { products: true } });
  console.log('categories', cats.map((c) => `${c.id}:${c.name}:${c.products.length}`).join('\n'));

  const weird = await prisma.product.findMany({
    where: { name: { contains: '1ml' } },
    select: { id: true, name: true, category: { select: { name: true } } },
    take: 100,
  });
  console.log('1ml names', weird.length);
  weird.forEach((p) => console.log(p.id, p.name, p.category.name));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
