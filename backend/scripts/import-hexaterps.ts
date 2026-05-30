import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseHtml, mapCategory, ParsedProduct } from './catalog-utils';

dotenv.config();

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseStockHint(text: string, available: boolean): number {
  const t = text.toLowerCase();
  if (!available) return 0;

  // "poslední 1 kus" / "poslední kus" / "poslední 2 kusy"
  const lastNumber = t.match(/posledn[íi]\s*(\d+)/i);
  if (lastNumber?.[1]) return Math.max(1, Number(lastNumber[1]));
  if (t.includes('poslední kus')) return 1;
  if (t.includes('omezené množství') || t.includes('omezené mnozstvi')) return 10;

  return 100;
}

async function upsertCategory(prisma: PrismaClient, name: string) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function upsertCannabinoid(prisma: PrismaClient, name: string) {
  const normalized = name.trim();
  return prisma.cannabinoid.upsert({
    where: { name: normalized },
    update: {},
    create: { name: normalized },
  });
}

async function main() {
  const file = getArg('--file');
  if (!file) {
    console.error('Usage: tsx scripts/import-hexaterps.ts --file path/to/file.html');
    process.exit(2);
  }

  const dryRun = hasFlag('--dry-run');
  const confirmed = dryRun || hasFlag('--yes') || process.env.IMPORT_HEXATERPS_CONFIRM === '1';
  if (!confirmed) {
    console.error(
      'Refusing to import without confirmation. Re-run with --yes or set IMPORT_HEXATERPS_CONFIRM=1. Use --dry-run to preview.',
    );
    process.exit(2);
  }

  const absolute = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const html = await fs.readFile(absolute, 'utf8');

  const parsed = parseHtml(html);
  console.log(`Parsed ${parsed.length} products from HTML`);

  const withoutPrice = parsed.filter((p) => p.variants.length === 0);
  if (withoutPrice.length > 0) {
    console.warn(
      `Warning: ${withoutPrice.length} products had no detectable price; they will be skipped (first: ${withoutPrice[0]?.baseName ?? 'n/a'})`,
    );
  }

  if (dryRun) {
    const withCannabinoids = parsed.filter((p) => p.cannabinoids.length > 0).length;
    console.log(`Dry run: ${withCannabinoids}/${parsed.length} products had cannabinoid percentages.`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Put it into backend/.env before running the import.');
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {

  for (const p of parsed) {
    if (p.variants.length === 0) continue;

    const categoryName = mapCategory(p.categoryTitle, p.baseName, p.rawText);
    const category = await upsertCategory(prisma, categoryName);

    for (const variant of p.variants) {
      const name = variant.variantName && variant.variantName !== 'Default'
        ? `${p.baseName} (${variant.variantName})`
        : p.baseName;

      const price = variant.priceCzk > 0 ? new Prisma.Decimal(variant.priceCzk) : new Prisma.Decimal(0);
      const stock = parseStockHint(`${p.rawText} ${variant.variantName}`, p.available);

      const existingProducts = await prisma.product.findMany({
        where: { name },
        select: { id: true },
        orderBy: { id: 'asc' },
      });

      const product = existingProducts.length > 0
        ? await prisma.product.update({
            where: { id: existingProducts[0].id },
            data: {
              categoryId: category.id,
              description: null,
              strain: p.strain,
              flavour: null,
              price,
              stock,
              image: p.image,
              featured: p.featured,
            },
          })
        : await prisma.product.create({
            data: {
              name,
              categoryId: category.id,
              description: null,
              strain: p.strain,
              flavour: null,
              price,
              stock,
              image: p.image,
              featured: p.featured,
            },
          });

      if (existingProducts.length > 1) {
        const duplicateIds = existingProducts.slice(1).map((p) => p.id);
        const deleted = await prisma.product.deleteMany({ where: { id: { in: duplicateIds } } });
        console.log(`Removed ${deleted.count} duplicate products with name: ${name}`);
      }

      await prisma.productCannabinoid.deleteMany({ where: { productId: product.id } });
      if (p.cannabinoids.length > 0) {
        const cannabinoidIds: Array<{ cannabinoidId: number; percentage: Prisma.Decimal }> = [];
        for (const c of p.cannabinoids) {
          const cannabinoid = await upsertCannabinoid(prisma, c.name);
          cannabinoidIds.push({
            cannabinoidId: cannabinoid.id,
            percentage: new Prisma.Decimal(c.percentage),
          });
        }

        await prisma.productCannabinoid.createMany({
          data: cannabinoidIds.map((c) => ({
            productId: product.id,
            cannabinoidId: c.cannabinoidId,
            percentage: c.percentage,
          })),
        });
      }

      console.log(`${existingProducts.length > 0 ? 'Updated' : 'Created'} product: ${product.id} ${product.name}`);
    }
  }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
