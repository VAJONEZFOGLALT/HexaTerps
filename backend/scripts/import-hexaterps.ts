import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { PrismaClient, Prisma, Strain } from '@prisma/client';
import * as cheerio from 'cheerio';

dotenv.config();

type ParsedVariant = {
  variantName: string;
  priceCzk: number;
};

type ParsedProduct = {
  categoryTitle: string;
  baseName: string;
  image: string | null;
  description: string;
  strain: Strain;
  featured: boolean;
  available: boolean;
  variants: ParsedVariant[];
  cannabinoids: Array<{ name: string; percentage: string }>;
  fallbackPriceCzk: number | null;
  rawText: string;
};

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function normalizeStrain(text: string): Strain {
  const t = text.toLowerCase();
  if (t.includes('sativa')) return 'SATIVA';
  if (t.includes('indica')) return 'INDICA';
  if (t.includes('hybrid')) return 'HYBRID';
  return 'HYBRID';
}

function parseStockHint(text: string, available: boolean): number {
  const t = text.toLowerCase();
  if (!available) return 0;

  // "poslední 1 kus" / "poslední kus" / "poslední 2 kusy"
  const lastNumber = t.match(/posledn[íi]\s*(\d+)/i);
  if (lastNumber?.[1]) return Math.max(1, Number(lastNumber[1]));
  if (t.includes('poslední kus')) return 1;
  if (t.includes('omezené množství') || t.includes('omezené mnozstvi')) return 10;

  // Default for MVP
  return 100;
}

function cleanCannabinoidName(token: string): string {
  const upper = token.toUpperCase().replace(/[^A-Z0-9+]/g, '');

  if (upper === 'H') return 'HHC';
  if (upper === 'D9') return 'D9';
  if (upper.startsWith('CBD')) return 'CBD';
  if (upper.startsWith('CBG')) return 'CBG';
  if (upper.startsWith('CBC')) return 'CBC';
  if (upper.startsWith('CBN')) return 'CBN';
  if (upper === 'THCV') return 'THCv';
  if (upper === 'THCVA') return 'THCv';
  if (upper === 'THA' || upper === 'TH-A' || upper === 'THA') return 'THCa';
  if (upper === 'THCA') return 'THCa';
  if (upper === 'HEXA') return 'Hexa';
  if (upper === 'H4CBD') return 'H4CBD';
  if (upper === 'HP') return 'HP';
  if (upper === 'PPB' || upper === 'PEB' || upper === 'PPBPEB') return 'PPB';

  // fallback: keep short tokens
  if (upper.length <= 10) return upper;
  return upper.slice(0, 10);
}

function parseCannabinoids(text: string): Array<{ name: string; percentage: string }> {
  // Example: "... + 5% CBG, 5% CBC, 2% CBD, 3% THCv"
  const results: Array<{ name: string; percentage: string }> = [];
  const regex = /(\d+(?:[.,]\d+)?)\s*%\s*([A-Za-z0-9+]+(?:\s*[A-Za-z0-9+]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const percentage = match[1].replace(',', '.');
    const rawToken = match[2];
    const name = cleanCannabinoidName(rawToken);
    if (!name) continue;

    // Skip obvious non-cannabinoid percentages like terpenes.
    if (name === 'TERPENY' || name === 'TERPENES') continue;

    results.push({ name, percentage });
  }

  // Deduplicate by name (keep first)
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
}

function mapCategory(title: string, baseName?: string, infoText?: string): string {
  const t = title.toLowerCase();
  const name = (baseName || '').toLowerCase();
  const info = (infoText || '').toLowerCase();
  const mapping: Array<[RegExp, string]> = [
    [/limitovan.+?nab[ií]dka\s*-\s*h blendy/i, 'Limited HHC blends'],
    [/h blendy/i, 'Limited HHC blends'],
    [/limitovan.+?nab[ií]dka/i, 'Limited blend'],
    [/gummy|gummies|gum(?:my|ys)/i, 'Edibles'],
    [/live resin/i, 'Live Resin HHC blends'],
    [/botanick[eé] terpeny/i, 'BDT HHC blends'],
    [/95% h \+ 5% terpeny/i, 'BDT HHC blends'],
    [/95% hhc \+ 5% terpeny/i, 'BDT HHC blends'],
    [/novinky s d9/i, 'D9/D9+Other cannabinoids blends'],
    [/\bd9\b/i, 'D9/D9+Other cannabinoids blends'],
    [/dopl[nň]kov[yý] sortiment|koncentrat|concentrat|hash/i, 'Concentrates'],
  ];

  for (const [re, mapped] of mapping) {
    if (re.test(title) || re.test(name) || re.test(info)) return mapped;
  }

  return title.trim() || 'Uncategorized';
}

function parseHtml(html: string): ParsedProduct[] {
  const $ = cheerio.load(html);

  const products: ParsedProduct[] = [];

  // Each product card has .produkt
  $('.produkt').each((_, el) => {
    const productEl = $(el);
    const baseName = (productEl.attr('data-jmeno') || productEl.find('strong').first().text()).trim();

    // Find nearest category title
    const categoryTitleRaw = productEl.closest('.kategorie').find('h2').first().text().trim();
    const categoryTitle = categoryTitleRaw || 'Uncategorized';

    const imgSrc = productEl.find('img').first().attr('src') ?? null;

    const fallbackPriceCzk = (() => {
      const raw = productEl.attr('data-cena');
      if (!raw) return null;
      const num = Number(String(raw).replace(/[^0-9]/g, ''));
      return Number.isFinite(num) && num > 0 ? num : null;
    })();

    const infoText = productEl.find('.info').text().replace(/\s+/g, ' ').trim();
    const descriptionText = productEl.find('.info > div').first().text().trim();

    const variantBlocks = productEl.find('.variantBlock');
    const variants: ParsedVariant[] = [];
    variantBlocks.each((_, vEl) => {
      const v = $(vEl);
      const variantName = v.find('.vName').text().trim();
      const priceText = v.find('.vPrice').text();
      const priceNumber = Number(String(priceText).replace(/[^0-9]/g, ''));
      if (!variantName || !Number.isFinite(priceNumber) || priceNumber <= 0) return;
      variants.push({ variantName, priceCzk: priceNumber });
    });

    const available = !productEl.hasClass('nedostupne');

    const strain = normalizeStrain(`${baseName} ${infoText}`);
    const featured = categoryTitle.toLowerCase().includes('limitovan');

    const cannabinoids = parseCannabinoids(infoText);

    const effectiveVariants =
      variants.length > 0
        ? variants
        : fallbackPriceCzk
          ? [{ variantName: 'Default', priceCzk: fallbackPriceCzk }]
          : [];

    products.push({
      categoryTitle,
      baseName,
      image: imgSrc,
      description: descriptionText,
      strain,
      featured,
      available,
      variants: effectiveVariants,
      cannabinoids,
      fallbackPriceCzk,
      rawText: infoText,
    });
  });

  return products;
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
              description: p.description || null,
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
              description: p.description || null,
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
