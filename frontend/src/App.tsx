import { useEffect, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [cats, prods] = await Promise.all([api.getCategories(), api.getProducts()]);
        if (cancelled) return;
        setCategories(cats);
        setProducts(prods);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
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

  const categoryShowcase = useMemo(() => {
    return orderedCategories.map((category) => {
      const items = products.filter((product) => product.categoryId === category.id);
      const featuredCount = items.filter((product) => product.featured).length;
      const lowestPrice = items.length
        ? items.reduce((min, product) => Math.min(min, Number(product.price)), Number.POSITIVE_INFINITY)
        : Number.NaN;

      return {
        category,
        itemCount: items.length,
        featuredCount,
        priceLabel: Number.isFinite(lowestPrice) ? formatCzk(lowestPrice) : null,
      };
    });
  }, [orderedCategories, products]);

  function jumpToCategory(categoryId: number | 'all') {
    setSelectedCategoryId(categoryId);
    setMenuOpen(false);
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
            A generic landing page with a dark cyber skin, a featured categories section, and nothing else getting in the way.
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

        <div className="heroStats">
          <div className="statCard">
            <span>Categories</span>
            <strong>{orderedCategories.length}</strong>
          </div>
          <div className="statCard">
            <span>Featured</span>
            <strong>{categoryShowcase.filter((entry) => entry.itemCount > 0).length}</strong>
          </div>
          <div className="statCard">
            <span>Live drops</span>
            <strong>{products.length}</strong>
          </div>
        </div>
      </section>

      <section className="categoryShowcase">
        <div className="sectionHead showcaseHead">
          <div>
            <div className="panelTitle">Featured categories</div>
            <div className="muted">Tap a card or use the dropdown to move around the catalog.</div>
          </div>
          <button type="button" className="chip chipInline" onClick={() => jumpToCategory('all')}>
            Featured only
          </button>
        </div>

        {loading ? <div className="muted">{t('loading')}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        <div className="showcaseGrid">
          {categoryShowcase.map((entry, index) => (
            <button
              key={entry.category.id}
              type="button"
              className={selectedCategoryId === entry.category.id ? 'showcaseCard active' : 'showcaseCard'}
              style={{ animationDelay: `${index * 70}ms` }}
              onClick={() => jumpToCategory(entry.category.id)}
            >
              <div className="showcaseTop">
                <span className="showcaseLabel">{entry.category.name}</span>
                {entry.itemCount > 0 ? (
                  <span className="showcaseBadge">
                    {entry.featuredCount > 0 ? `${entry.featuredCount} featured` : `${entry.itemCount} live`}
                  </span>
                ) : (
                  <span className="showcaseBadge mutedBadge">Empty</span>
                )}
              </div>
              <strong>{entry.itemCount} products</strong>
              <span className="showcasePrice">
                {entry.itemCount > 0 ? `From ${entry.priceLabel ?? '—'}` : 'Ready for first drop'}
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="footer">2026 HexaTerps</footer>
    </div>
  );
}

export default App;