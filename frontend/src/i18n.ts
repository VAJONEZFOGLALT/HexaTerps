type Lang = 'en' | 'cs';

const dict = {
  en: {
    appTagline: 'MVP webshop • order without registration',
    cartBadge: 'Cart: {total}',
    categories: 'Categories',
    all: 'All',
    products: 'Products',
    loading: 'Loading…',
    noProducts: 'No products.',
    emptyCart: 'Your cart is empty.',
    categoryLabel: 'Category',
    featured: 'featured',
    description: 'Description',
    flavourPrefix: 'Flavor:',
    compositionPrefix: 'Composition:',
    inStockPrefix: 'In stock:',
    order: 'Order',
    fullName: 'Name / nickname',
    contact: 'Contact (chat / phone)',
    delivery: 'Delivery',
    deliveryPickup: 'I will pick it up myself',
    deliveryCourier: 'PPL / courier',
    note: 'Note',
    submitOrder: 'Submit order',
    submitting: 'Sending…',
    orderSent: 'Order submitted. ID: {id}',
    adminHint:
      'Admin API is protected by token (no registration). For product management use `Authorization: Bearer ADMIN_TOKEN`.',
  },
  cs: {
    appTagline: 'MVP webshop • objednávka bez registrace',
    cartBadge: 'Košík: {total}',
    categories: 'Kategorie',
    all: 'Vše',
    products: 'Produkty',
    loading: 'Načítání…',
    noProducts: 'Žádné produkty.',
    emptyCart: 'Košík je prázdný.',
    categoryLabel: 'Kategorie',
    featured: 'featured',
    description: 'Popis',
    flavourPrefix: 'Příchuť:',
    compositionPrefix: 'Složení:',
    inStockPrefix: 'Sklad:',
    order: 'Objednávka',
    fullName: 'Jméno / přezdívka',
    contact: 'Kontakt (chat / tel.)',
    delivery: 'Doručení',
    deliveryPickup: 'Dopravu si udělám sám',
    deliveryCourier: 'PPL / kurýr',
    note: 'Poznámka',
    submitOrder: 'Odeslat objednávku',
    submitting: 'Odesílám…',
    orderSent: 'Objednávka odeslána. Číslo: {id}',
    adminHint:
      'Admin API je chráněné tokenem (bez registrace). Pro správu produktů použij `Authorization: Bearer ADMIN_TOKEN`.',
  },
} satisfies Record<Lang, Record<string, string>>;

let currentLang: Lang = 'en';

function detectLang(): Lang {
  const saved = localStorage.getItem('hexaterps.lang');
  if (saved === 'en' || saved === 'cs') return saved;

  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  if (nav.toLowerCase().startsWith('cs')) return 'cs';
  return 'en';
}

export function setLanguage(lang: Lang) {
  currentLang = lang;
  try {
    localStorage.setItem('hexaterps.lang', lang);
  } catch {
    // ignore
  }
}

export function initI18n() {
  currentLang = detectLang();
}

export function t(key: keyof typeof dict.en, vars?: Record<string, string | number>) {
  const template = dict[currentLang][key] ?? dict.en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''));
}

