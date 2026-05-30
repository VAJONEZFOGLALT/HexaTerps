import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseHtml, mapCategory } from '../scripts/catalog-utils';

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

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parseStockHint(text: string, available: boolean): number {
  const t = text.toLowerCase();
  if (!available) return 0;
  const lastNumber = t.match(/posledn[íi]\s*(\d+)/i);
  if (lastNumber?.[1]) return Math.max(1, Number(lastNumber[1]));
  if (t.includes('poslední kus')) return 1;
  if (t.includes('omezené množství') || t.includes('omezené mnozstvi')) return 10;
  return 100;
}

async function main() {
  const fileArg = getArg('--file');
  const sourcePath = fileArg ?? path.join(__dirname, '../data/HexaTerps.html');
  const absolutePath = path.isAbsolute(sourcePath) ? sourcePath : path.join(process.cwd(), sourcePath);

  const html = await fs.readFile(absolutePath, 'utf8');
  const parsed = parseHtml(html);
  console.log(`Parsed ${parsed.length} products from HTML`);

  const productNames = new Set<string>();
  const seedItems: Array<{
    name: string;
    product: typeof parsed[number];
    variant: { variantName: string; priceCzk: number };
  }> = [];

  for (const product of parsed) {
    for (const variant of product.variants) {
      const name = variant.variantName && variant.variantName !== 'Default'
        ? `${product.baseName} (${variant.variantName})`
        : product.baseName;
      if (productNames.has(name)) continue;
      productNames.add(name);
      seedItems.push({ name, product, variant });
    }
  }

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productCannabinoid.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.cannabinoid.deleteMany();

  const categoryMap = new Map<string, number>();
  for (const name of CANONICAL_CATEGORIES) {
    const created = await prisma.category.create({ data: { name } });
    categoryMap.set(name, created.id);
  }

  const cannabinoidNames = new Set(BASE_CANNABINOIDS);
  for (const item of seedItems) {
    for (const cannabinoid of item.product.cannabinoids) {
      cannabinoidNames.add(cannabinoid.name);
    }
  }

  const cannabinoidMap = new Map<string, number>();
  for (const name of [...cannabinoidNames].sort()) {
    const created = await prisma.cannabinoid.create({ data: { name } });
    cannabinoidMap.set(name, created.id);
  }

  for (const item of seedItems) {
    const categoryName = mapCategory(item.product.categoryTitle, item.product.baseName, item.product.rawText);
    const categoryKey = CANONICAL_CATEGORIES.includes(categoryName as typeof CANONICAL_CATEGORIES[number])
      ? categoryName
      : 'Concentrates';
    const categoryId = categoryMap.get(categoryKey) as number;
    const price = item.variant.priceCzk > 0 ? new Prisma.Decimal(item.variant.priceCzk) : new Prisma.Decimal(0);
    const stock = parseStockHint(`${item.product.rawText} ${item.variant.variantName}`, item.product.available);

    await prisma.product.create({
      data: {
        name: item.name,
        categoryId,
        description: null,
        strain: item.product.strain,
        flavour: null,
        price,
        stock,
        image: item.product.image,
        featured: item.product.featured,
        cannabinoids: {
          create: item.product.cannabinoids.map((c) => ({
            cannabinoidId: cannabinoidMap.get(c.name) as number,
            percentage: new Prisma.Decimal(c.percentage),
          })),
        },
      },
    });
  }

  console.log(`Seeded ${seedItems.length} products into ${CANONICAL_CATEGORIES.length} categories.`);
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
