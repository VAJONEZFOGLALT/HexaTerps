import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function mapCategory(title: string): string {
  const t = (title || '').toLowerCase();
  const mapping: Array<[RegExp, string]> = [
    [/limitovan.+?nab[ií]dka\s*-\s*h blendy/i, 'Limited HHC blends'],
    [/h blendy/i, 'Limited HHC blends'],
    [/limitovan.+?nab[ií]dka/i, 'Limited blend'],
    [/gummy|gummies|gum(?:my|ys)/i, 'Edibles'],
    [/live resin/i, 'Live Resin HHC blends'],
    [/novinky s d9/i, 'D9/D9+Other cannabinoids blends'],
    [/\bd9\b/i, 'D9/D9+Other cannabinoids blends'],
    [/botanick[eé] terpeny/i, 'BDT HHC blends'],
    [/95% h \+ 5% terpeny/i, 'BDT HHC blends'],
    [/95% hhc \+ 5% terpeny/i, 'BDT HHC blends'],
    [/dopl[nň]kov[yý] sortiment|koncentrat|concentrat|hash/i, 'Concentrates'],
    [/baterky|equipment|510/i, 'Equipment'],
  ];

  for (const [re, mapped] of mapping) {
    if (re.test(title)) return mapped;
  }

  return title.trim() || 'Uncategorized';
}

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const dryRun = hasFlag('--dry-run');

  const categories = await prisma.category.findMany({ include: { products: true } });
  console.log(`Found ${categories.length} categories`);

  for (const cat of categories) {
    const mapped = mapCategory(cat.name);
    if (mapped === cat.name) continue;

    console.log(`Category '${cat.name}' -> mapped to '${mapped}' (products: ${cat.products.length})`);

    if (dryRun) continue;

    const target = await prisma.category.upsert({
      where: { name: mapped },
      update: {},
      create: { name: mapped },
    });

    const res = await prisma.product.updateMany({
      where: { categoryId: cat.id },
      data: { categoryId: target.id },
    });

    console.log(`  Moved ${res.count} products to category id ${target.id} ('${target.name}')`);

    // If original category now has no products, delete it
    const remaining = await prisma.product.count({ where: { categoryId: cat.id } });
    if (remaining === 0) {
      try {
        await prisma.category.delete({ where: { id: cat.id } });
        console.log(`  Deleted empty category '${cat.name}'`);
      } catch (e) {
        console.warn(`  Could not delete category '${cat.name}': ${e}`);
      }
    }
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
