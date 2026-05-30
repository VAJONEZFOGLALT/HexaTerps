import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import type { Category, Product } from './types';
import { api } from './api';
import { formatCzk } from './money';
import { t } from './i18n';
import AdminPanel from './Admin';

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const categoryRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [cats, prods] = await Promise.all([api.getCategories(), api.getProducts()]);
      if (cancelled) return;
      setCategories(cats);
      setProducts(prods);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOrder = [
    'Limited blend',
    'Limited HHC blends',
    'BDT HHC blends',
    'Live Resin HHC blends',
    'D9/D9+Other cannabinoids blends',
    'Edibles',
    'Concentrates',
    'Equipment',
  ];

  const orderedCategories = useMemo(() => {
    const orderMap = new Map(categoryOrder.map((name, index) => [name, index]));
    return [...categories].sort((a, b) => {
      const orderA = orderMap.has(a.name) ? (orderMap.get(a.name) as number) : Number.POSITIVE_INFINITY;
      const orderB = orderMap.has(b.name) ? (orderMap.get(b.name) as number) : Number.POSITIVE_INFINITY;
      if (orderA === orderB) return a.name.localeCompare(b.name);
      return orderA - orderB;
    });
  }, [categories]);

  const featuredCategories = useMemo(
    () => orderedCategories.filter((category) => category.featured),
    [orderedCategories],
  );

  function jumpToCategory(categoryId: number | 'all') {
    setSelectedCategoryId(categoryId);
    setMenuOpen(false);

    if (categoryId === 'all') return;
    window.setTimeout(() => {
      categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  return (
    <div className="page">
      <header className="header">
        <div className="headerLeft">
          <div className={`menuWrap ${menuOpen ? 'open' : ''}`}>
            <button type="button" className="menuButton" onClick={() => setMenuOpen((prev) => !prev)}>
              Shop by category <span>▾</span>
            </button>

            {menuOpen ? (
              <div className="menuDropdown">
                <button type="button" className="menuItem" onClick={() => jumpToCategory('all')}>
                  Featured categories
                </button>
                {orderedCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="menuItem"
                    onClick={() => jumpToCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="headerCenter">
          <div className="brand">HexaTerps</div>
          <div className="tagline">{t('appTagline')}</div>
        </div>

        <div className="headerRight">
          <a href="/admin" className="admin-link" title="Admin Panel">
            🛡️
          </a>
          <div className="statusPill">2026</div>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <div className="heroEyebrow">After-hours boutique • cyber palette • smooth motion</div>
          <h1>HexaTerps drops, styled like a night market.</h1>
          <p>
            A clean landing page with a dark cyber look, featured categories, and no product wall underneath.
          </p>
          <div className="heroActions">
            <button type="button" className="heroButton" onClick={() => setMenuOpen((prev) => !prev)}>
              Browse categories
            </button>
            <button
              type="button"
              className="heroGhost"
              onClick={() => {
                const target = document.querySelector('.categoryShowcase');
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Featured categories
            </button>
          </div>
        </div>
      </section>

      <section className="categoryShowcase">
        <div className="sectionHead showcaseHead">
          <div>
            <div className="panelTitle">Featured categories</div>
            <div className="muted">Pick a shelf or use the dropdown to jump there.</div>
          </div>
        </div>

        <div className="showcaseGrid">
          {featuredCategories.map((category, index) => {
            const items = products.filter((product) => product.categoryId === category.id);
            const featuredCount = items.filter((product) => product.featured).length;
            const lowestPrice = items.length
              ? items.reduce((min, product) => Math.min(min, Number(product.price)), Number.POSITIVE_INFINITY)
              : Number.NaN;

            return (
              <button
                key={category.id}
                ref={(element) => {
                  categoryRefs.current[category.id] = element;
                }}
                type="button"
                className={selectedCategoryId === category.id ? 'showcaseCard active' : 'showcaseCard'}
                style={{ animationDelay: `${index * 70}ms` }}
                onClick={() => jumpToCategory(category.id)}
              >
                <div className="showcaseTop">
                  <span className="showcaseLabel">{category.name}</span>
                  <span className="showcaseBadge">
                    {featuredCount > 0 ? `${featuredCount} featured` : `${items.length} live`}
                  </span>
                </div>
                <strong>{items.length} products</strong>
                <span className="showcasePrice">
                  {items.length > 0 ? `From ${formatCzk(lowestPrice)}` : 'Ready for first drop'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="footer">2026 HexaTerps</footer>
    </div>
  );
}

export default App;