import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bad = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'terpen' } },
        { name: { contains: 'mvp' } },
        { name: { contains: 'webshop' } },
        { name: { contains: 'order without reg' } },
      ],
    },
    select: { id: true, name: true, category: { select: { name: true } }, description: true },
  });

  console.log('bad product names:', bad.length);
  bad.forEach((p) => console.log(p.id, p.name, p.category.name, p.description));

  const weird = await prisma.product.findMany({
    where: { name: { contains: '1ml' } },
    select: { id: true, name: true, category: { select: { name: true } } },
    take: 50,
  });
  console.log('1ml products:', weird.length);
  weird.forEach((p) => console.log(p.id, p.name, p.category.name));

  const descs = await prisma.product.findMany({
    where: { description: { not: null } },
    select: { id: true, name: true, description: true },
    take: 20,
  });
  console.log('products with descriptions:', descs.length);
  descs.forEach((p) => console.log(p.id, p.name, p.description?.slice(0, 80)));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
