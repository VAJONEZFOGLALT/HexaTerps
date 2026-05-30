import * as cheerio from 'cheerio';
import type { Strain } from '@prisma/client';

export type ParsedVariant = {
  variantName: string;
  priceCzk: number;
};

export type ParsedCannabinoid = {
  name: string;
  percentage: string;
  type: 'base' | 'terpenes' | 'minor' | 'other';
};

export type ParsedProduct = {
  categoryTitle: string;
  baseName: string;
  image: string | null;
  description: string;
  strain: Strain;
  featured: boolean;
  available: boolean;
  variants: ParsedVariant[];
  cannabinoids: Array<{ name: string; percentage: string }>;
  rawText: string;
};

export const CANONICAL_CATEGORIES = [
  'Limited blend',
  'Limited HHC blends',
  'BDT HHC blends',
  'Live Resin HHC blends',
  'D9/D9+Other cannabinoids blends',
  'Edibles',
  'Concentrates',
] as const;

const MINOR_NAMES = ['CBD', 'CBG', 'CBC', 'CBN', 'H4CBD'];

export function normalizeStrain(text: string): Strain {
  const t = text.toLowerCase();
  if (t.includes('sativa')) return 'SATIVA';
  if (t.includes('indica')) return 'INDICA';
  if (t.includes('hybrid')) return 'HYBRID';
  return 'HYBRID';
}

function normalizeBaseName(raw: string): string {
  return raw
    .replace(/\s*\((?:jednorázovka|jednorazovka)[^)]*\b\d+\s*ml[^)]*\)/gi, '')
    .replace(/\s*\([^)]*\b\d+\s*ml[^)]*\)/gi, '')
    .replace(/\b\d+\s*ml\b/gi, '')
    .replace(/\bcartridge\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanCannabinoidName(token: string): string {
  const upper = token.toUpperCase().replace(/[^A-Z0-9+\-Δ⁹]/g, '');

  if (upper === 'H' || upper === 'HHC' || upper === 'HEXA' || upper === 'HEX') return 'HHC';
  if (upper.startsWith('HHCP')) return 'HHCP';
  if (upper.startsWith('H4CBD')) return 'H4CBD';
  if (upper.includes('Δ9') || upper.includes('D9') || upper.includes('DELTA')) return 'Δ⁹-THC';
  if (upper.includes('CBD')) return 'CBD';
  if (upper.includes('CBG')) return 'CBG';
  if (upper.includes('CBC')) return 'CBC';
  if (upper.includes('CBN')) return 'CBN';
  if (upper === 'THCV' || upper === 'THCVA') return 'THCv';
  if (upper === 'THA' || upper === 'TH-A' || upper === 'THCA') return 'THCa';
  if (upper === 'HP') return 'HP';
  if (upper === 'PPB' || upper === 'PEB' || upper === 'PPBPEB') return 'PPB';
  if (upper.includes('TERPEN')) return 'Terpenes';

  return upper;
}

function classifyCannabinoid(name: string): ParsedCannabinoid['type'] {
  if (name === 'HHC' || name === 'Δ⁹-THC') return 'base';
  if (name === 'Terpenes') return 'terpenes';
  if (MINOR_NAMES.includes(name)) return 'minor';
  return 'other';
}

function inferBase(name: string, info: string, category: string): string | null {
  const context = `${name} ${info} ${category}`.toLowerCase();
  if (category.toLowerCase().includes('d9')) return 'Δ⁹-THC';
  if (category.toLowerCase().includes('hhc')) return 'HHC';
  if (/\b(d9|delta|Δ⁹|Δ9)\b/i.test(context)) return 'Δ⁹-THC';
  if (/\b(hhc|h blend|botanick|live resin|hexa|hex)\b/i.test(context)) return 'HHC';
  return null;
}

export function mapCategory(title: string, baseName?: string, infoText?: string): string {
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
    [/baterky|equipment|510/i, 'Concentrates'],
    [/dopl[nň]kov[yý] sortiment|koncentrat|concentrat|hash/i, 'Concentrates'],
  ];

  for (const [re, mapped] of mapping) {
    if (re.test(title) || re.test(name) || re.test(info)) return mapped;
  }

  if (title.trim()) return title.trim();
  return 'Concentrates';
}

function parseCannabinoids(text: string, categoryName: string, baseName: string, infoText: string): ParsedCannabinoid[] {
  const results: ParsedCannabinoid[] = [];
  const regex = /(\d+(?:[.,]\d+)?)\s*%\s*([A-Za-z0-9+\-Δ⁹ ]+?)(?=[,;]|$)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const percentage = match[1].replace(',', '.');
    const rawToken = match[2].trim();
    const name = cleanCannabinoidName(rawToken);
    if (!name) continue;
    results.push({ name, percentage, type: classifyCannabinoid(name) });
  }

  const seen = new Set<string>();
  const deduped = results.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });

  const hasBase = deduped.some((item) => item.type === 'base');
  if (!hasBase) {
    const inferred = inferBase(baseName, infoText, categoryName);
    if (inferred) {
      const total = deduped.reduce((sum, item) => sum + Number(item.percentage), 0);
      const remaining = Math.max(0, 100 - total);
      if (remaining > 0) {
        deduped.unshift({ name: inferred, percentage: remaining.toFixed(1).replace(/\.0$/, ''), type: 'base' });
      }
    }
  }

  const hasTerpenes = deduped.some((item) => item.type === 'terpenes');
  if (!hasTerpenes && /terpen/i.test(text)) {
    const explicit = text.match(/(?:botanick[eé]?\s*terpeny|terpen(?:y|es)?)[^0-9]*(\d+(?:[.,]\d+)?)\s*%/i);
    if (explicit?.[1]) {
      deduped.push({ name: 'Terpenes', percentage: explicit[1].replace(',', '.'), type: 'terpenes' });
    }
  }

  deduped.sort((a, b) => {
    const order = { base: 0, terpenes: 1, minor: 2, other: 3 } as const;
    if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
    return a.name.localeCompare(b.name);
  });

  return deduped;
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

function shouldExcludeProduct(name: string): boolean {
  const badPatterns = [/terpeny1ml/i, /mvp/i, /webshop/i, /order without reg/i];
  return badPatterns.some((re) => re.test(name));
}

export function parseHtml(html: string): ParsedProduct[] {
  const $ = cheerio.load(html);
  const products: ParsedProduct[] = [];

  $('.produkt').each((_, el) => {
    const productEl = $(el);
    const rawBaseName = (productEl.attr('data-jmeno') || productEl.find('strong').first().text()).trim();
    const baseName = normalizeBaseName(rawBaseName);
    if (shouldExcludeProduct(baseName)) return;

    const categoryTitleRaw = productEl.closest('.kategorie').find('h2').first().text().trim();
    const categoryTitle = categoryTitleRaw || 'Concentrates';
    const imgSrc = productEl.find('img').first().attr('src') ?? null;
    const rawInfo = productEl.find('.info').text().replace(/\s+/g, ' ').trim();
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
    const strain = normalizeStrain(`${baseName} ${rawInfo}`);
    const featured = categoryTitle.toLowerCase().includes('limitovan');
    const cannabinoids = parseCannabinoids(rawInfo, categoryTitle, baseName, rawInfo).map((c) => ({ name: c.name, percentage: c.percentage }));

    const fallbackPriceCzk = (() => {
      const raw = productEl.attr('data-cena');
      if (!raw) return null;
      const num = Number(String(raw).replace(/[^0-9]/g, ''));
      return Number.isFinite(num) && num > 0 ? num : null;
    })();

    const effectiveVariants = variants.length > 0
      ? variants
      : fallbackPriceCzk
        ? [{ variantName: 'Default', priceCzk: fallbackPriceCzk }]
        : [];

    if (effectiveVariants.length === 0) return;

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
      rawText: rawInfo,
    });
  });

  return products;
}
