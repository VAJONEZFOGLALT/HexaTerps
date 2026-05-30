import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import type { Category, CreateOrderPayload, DeliveryMethod, Product } from './types';
import { api } from './api';
import { formatCzk } from './money';
import { t } from './i18n';
import AdminPanel from './Admin';

type CartItem = {
  product: Product;
  deviceId?: number;
  unitPrice: string;
  quantity: number;
};

function getCartItemKey(productId: number, deviceId?: number) {
  return `${productId}:${deviceId ?? 'base'}`;
}

function getProductUnitPrice(product: Product, deviceId?: number): string {
  if (deviceId) {
    const selected = product.devices.find((device) => device.deviceId === deviceId);
    if (selected) return selected.price;
  }

  return product.price;
}

function getProductDeviceName(product: Product, deviceId?: number): string | null {
  if (!deviceId) return null;
  const selected = product.devices.find((device) => device.deviceId === deviceId);
  return selected?.device.name ?? null;
}

function sumCart(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + Number(item.unitPrice) * item.quantity, 0);
}

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Record<number, number>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('PICKUP');
  const [note, setNote] = useState('');
  const [orderResult, setOrderResult] = useState<{ id: number } | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const categoryRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    const saved = localStorage.getItem('hexaterps.cart');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Array<{
        productId: number;
        deviceId?: number;
        unitPrice?: string;
        quantity: number;
      }>;
      if (!Array.isArray(parsed)) return;
      // Cart will be hydrated after products load.
      localStorage.setItem('hexaterps.cart.pending', JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }, []);

  const CATEGORY_ORDER = [
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
    const orderMap = new Map(CATEGORY_ORDER.map((n, i) => [n, i]));
    return [...categories].sort((a, b) => {
      const ia = orderMap.has(a.name) ? (orderMap.get(a.name) as number) : Number.POSITIVE_INFINITY;
      const ib = orderMap.has(b.name) ? (orderMap.get(b.name) as number) : Number.POSITIVE_INFINITY;
      if (ia === ib) return a.name.localeCompare(b.name);
      return ia - ib;
    });
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(
      'hexaterps.cart',
      JSON.stringify(
        cart.map((c) => ({
          productId: c.product.id,
          deviceId: c.deviceId,
          unitPrice: c.unitPrice,
          quantity: c.quantity,
        })),
      ),
    );
  }, [cart]);

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

        setSelectedDeviceIds((prev) => {
          const next = { ...prev };
          for (const product of prods) {
            if (product.devices.length > 0 && next[product.id] === undefined) {
              next[product.id] = product.devices[0].deviceId;
            }
          }
          return next;
        });

        const pending = localStorage.getItem('hexaterps.cart.pending');
        if (pending) {
          try {
            const parsed = JSON.parse(pending) as Array<{
              productId: number;
              deviceId?: number;
              unitPrice?: string;
              quantity: number;
            }>;
            const byId = new Map(prods.map((p) => [p.id, p] as const));
            const hydrated: CartItem[] = parsed
              .map((x) => ({ product: byId.get(x.productId), item: x }))
              .filter((x): x is { product: Product; item: { productId: number; deviceId?: number; unitPrice?: string; quantity: number } } => Boolean(x.product))
              .map((x) => {
                const deviceId =
                  x.item.deviceId ?? x.product.devices[0]?.deviceId;
                const unitPrice = x.item.unitPrice ?? getProductUnitPrice(x.product, deviceId);
                return {
                  product: x.product,
                  deviceId,
                  unitPrice,
                  quantity: Math.max(1, x.item.quantity),
                };
              });
            setCart(hydrated);
          } finally {
            localStorage.removeItem('hexaterps.cart.pending');
          }
        }
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

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === 'all') return products;
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const featuredProducts = useMemo(() => filteredProducts.filter((p) => p.featured), [filteredProducts]);

  const categoryShowcase = useMemo(() => {
    return orderedCategories
      .map((category) => {
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
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [orderedCategories, products]);

  const productsByCategory = useMemo(() => {
    if (selectedCategoryId !== 'all') {
      const selected = categories.find((c) => c.id === selectedCategoryId);
      return selected ? [{ category: selected, items: filteredProducts }] : [];
    }

    return orderedCategories
      .map((category) => ({
        category,
        items: products.filter((p) => p.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, filteredProducts, orderedCategories, products, selectedCategoryId]);

  const cartTotal = useMemo(() => sumCart(cart), [cart]);

  function getSelectedDeviceId(product: Product): number | undefined {
    if (product.devices.length === 0) return undefined;
    return selectedDeviceIds[product.id] ?? product.devices[0].deviceId;
  }

  function getSelectedQuantity(productId: number, deviceId: number | undefined): number {
    return cart.find((item) => item.product.id === productId && item.deviceId === deviceId)?.quantity ?? 0;
  }

  function getProductQuantityInCart(productId: number): number {
    return cart
      .filter((item) => item.product.id === productId)
      .reduce((acc, item) => acc + item.quantity, 0);
  }

  function jumpToCategory(categoryId: number | 'all') {
    setSelectedCategoryId(categoryId);
    setMenuOpen(false);
    if (categoryId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.setTimeout(() => {
      categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function setCategoryRef(categoryId: number, element: HTMLElement | null) {
    categoryRefs.current[categoryId] = element;
  }

  function setQuantity(product: Product, deviceId: number | undefined, quantity: number) {
    setCart((prev) => {
      const existingQuantity = prev
        .filter((item) => item.product.id === product.id && item.deviceId !== deviceId)
        .reduce((acc, item) => acc + item.quantity, 0);
      const clamped = Math.max(0, Math.min(quantity, Math.max(0, product.stock - existingQuantity)));
      const unitPrice = getProductUnitPrice(product, deviceId);
      const existing = prev.find(
        (x) => x.product.id === product.id && x.deviceId === deviceId,
      );
      if (!existing) {
        return clamped <= 0
          ? prev
          : [...prev, { product, deviceId, unitPrice, quantity: clamped }];
      }
      if (clamped <= 0) {
        return prev.filter(
          (x) => !(x.product.id === product.id && x.deviceId === deviceId),
        );
      }
      return prev.map((x) =>
        x.product.id === product.id && x.deviceId === deviceId
          ? { ...x, quantity: clamped, unitPrice }
          : x,
      );
    });
  }

  async function placeOrder() {
    setOrderResult(null);
    setError(null);

    const items = cart.map((c) => ({
      productId: c.product.id,
      deviceId: c.deviceId,
      quantity: c.quantity,
    }));
    const payload: CreateOrderPayload = {
      fullName,
      contact,
      deliveryMethod,
      note: note.trim() ? note.trim() : undefined,
      items,
    };

    try {
      setPlacingOrder(true);
      const order = await api.createOrder(payload);
      setOrderResult({ id: order.id });
      setCart([]);
      setFullName('');
      setContact('');
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  }

  // Route to admin page if pathname is /admin
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brandBlock">
          <div className="brand">HexaTerps</div>
          <div className="tagline">{t('appTagline')}</div>
        </div>

        <div className="headerNav">
          <div className={`menuWrap ${menuOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="menuButton"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              Shop by category <span>▾</span>
            </button>

            {menuOpen ? (
              <div className="menuDropdown">
                <button type="button" className="menuItem" onClick={() => jumpToCategory('all')}>
                  All products
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

          <a href="/admin" className="admin-link" title="Admin Panel">
            🛡️
          </a>
          <div className="cartBadge">{t('cartBadge', { total: formatCzk(cartTotal) })}</div>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <div className="heroEyebrow">After-hours boutique • live inventory • custom device pricing</div>
          <h1>Welcome to the night shop.</h1>
          <p>
            A moody storefront for clean drops, premium browsing, and fast checkout.
          </p>
          <div className="heroActions">
            <button type="button" className="heroButton" onClick={() => jumpToCategory('all')}>
              Explore shop
            </button>
            <button
              type="button"
              className="heroGhost"
              onClick={() => {
                const target = document.querySelector('.categoryShowcase');
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              View products
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
            <strong>{featuredProducts.length}</strong>
          </div>
          <div className="statCard">
            <span>Cart total</span>
            <strong>{formatCzk(cartTotal)}</strong>
          </div>
        </div>
      </section>

      <section className="categoryShowcase">
        <div className="sectionHead showcaseHead">
          <div>
            <div className="panelTitle">Category shortcuts</div>
            <div className="muted">Tap a card to jump straight into that shelf.</div>
          </div>
          <button type="button" className="chip chipInline" onClick={() => jumpToCategory('all')}>
            Reset view
          </button>
        </div>

        <div className="showcaseGrid">
          {categoryShowcase.map((entry) => (
            <button
              key={entry.category.id}
              type="button"
              className={selectedCategoryId === entry.category.id ? 'showcaseCard active' : 'showcaseCard'}
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


      <main className="layout">
        <section className="content">
          <div className="sectionHead">
            <div>
              <div className="panelTitle">
                {selectedCategoryId === 'all' ? 'Featured categories' : t('products')}
              </div>
              <div className="muted">
                {selectedCategoryId === 'all'
                  ? 'Pick a shelf from the cards or the dropdown to start browsing.'
                  : 'Choose a category from the menu to jump straight there.'}
              </div>
            </div>
            {selectedCategoryId !== 'all' ? (
              <button type="button" className="chip chipInline" onClick={() => jumpToCategory('all')}>
                Back to categories
              </button>
            ) : null}
          </div>
          {loading ? <div className="muted">{t('loading')}</div> : null}
          {error ? <div className="error">{error}</div> : null}
          {!loading && selectedCategoryId !== 'all' && filteredProducts.length === 0 ? (
            <div className="marketEmpty">
              <div className="marketEmptyLabel">No live drops yet</div>
              <h2>Set the first collection in admin.</h2>
              <p>
                The storefront is ready — add products and the shelves will populate instantly.
              </p>
              <div className="marketEmptyActions">
                <a href="/admin" className="heroButton">
                  Open admin
                </a>
                <button type="button" className="heroGhost" onClick={() => jumpToCategory('all')}>
                  Refresh shop view
                </button>
              </div>
            </div>
          ) : null}

          {selectedCategoryId === 'all' ? (
            <div className="marketIntro">
              <div className="marketEmptyLabel">Featured categories</div>
              <h2>Choose a shelf before the products appear.</h2>
              <p>
                The homepage stays clean on purpose — tap a category card or use the dropdown to
                enter the collection.
              </p>
              <div className="marketIntroNote">
                Cyber boutique first. Product shelves load after a category is selected.
              </div>
            </div>
          ) : null}

          {selectedCategoryId !== 'all'
            ? productsByCategory.map(({ category, items }) => (
            <section
              key={category.id}
              className="categoryBlock"
              ref={(el) => setCategoryRef(category.id, el)}
              id={`category-${category.id}`}
            >
              <div className="sectionLabel">{category.name}</div>
              <div className="grid">
                {items.map((p) => {
              const selectedDeviceId = getSelectedDeviceId(p);
              const selectedDevice =
                p.devices.find((device) => device.deviceId === selectedDeviceId) ??
                p.devices[0];
              const unitPrice = selectedDevice?.price ?? p.price;
              const inCart = getSelectedQuantity(p.id, selectedDeviceId);
              const totalInCart = getProductQuantityInCart(p.id);
              const canAdd = p.stock > totalInCart;
              const cannabinoidsText = p.cannabinoids
                .map((c) => {
                  const suffix = c.unit === 'MG' ? 'mg' : '%';
                  return `${c.cannabinoid.name} ${c.percentage}${suffix}`;
                })
                .join(' • ');
              const deviceText = p.devices
                .map((device) => `${device.device.name} ${formatCzk(device.price)}`)
                .join(' • ');

                  return (
                    <article key={p.id} className="card">
                  <div className="cardTop">
                    <div className="cardTitle">{p.name}</div>
                    <div className="badges">
                      <span className="badge">{p.category?.name}</span>
                      <span className="badge">{p.strain.toLowerCase()}</span>
                      {p.featured ? <span className="badge strong">{t('featured')}</span> : null}
                    </div>
                  </div>

                  {p.flavour ? <div className="muted">{t('flavourPrefix')} {p.flavour}</div> : null}
                  {cannabinoidsText ? <div className="muted">{t('compositionPrefix')} {cannabinoidsText}</div> : null}
                  {p.devices.length > 0 ? <div className="muted">Device options: {deviceText}</div> : null}

                  {p.devices.length > 0 ? (
                    <label className="field" style={{ marginTop: 8 }}>
                      <span>Device</span>
                      <select
                        value={selectedDeviceId ?? ''}
                        onChange={(e) => {
                          const nextDeviceId = Number(e.target.value);
                          setSelectedDeviceIds((prev) => ({
                            ...prev,
                            [p.id]: nextDeviceId,
                          }));
                        }}
                      >
                        {p.devices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.device.name} - {formatCzk(device.price)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}


                  <div className="cardBottom">
                    <div className="price">{formatCzk(unitPrice)}</div>
                    <div className="stock">{t('inStockPrefix')} {p.stock}</div>
                    <div className="qty">

                      <button
                        type="button"
                        className="btn"
                        onClick={() => setQuantity(p, selectedDeviceId, inCart - 1)}
                        disabled={inCart <= 0}
                      >
                        −
                      </button>
                      <div className="qtyVal">{inCart}</div>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setQuantity(p, selectedDeviceId, inCart + 1)}
                        disabled={!canAdd}
                      >
                        +
                      </button>
                    </div>
                  </div>
                    </article>
                  );
                })}
              </div>
            </section>
              ))
            : null}
        </section>

        <aside className="sidebar">
          <div className="panelTitle">{t('order')}</div>
          {cart.length === 0 ? <div className="muted">{t('emptyCart')}</div> : null}


          {cart.length > 0 ? (
            <div className="cartList">
              {cart.map((c) => (
                <div key={getCartItemKey(c.product.id, c.deviceId)} className="cartRow">
                  <div className="cartName">
                    {c.product.name}
                    {getProductDeviceName(c.product, c.deviceId)
                      ? ` · ${getProductDeviceName(c.product, c.deviceId)}`
                      : ''}
                  </div>
                  <div className="cartQty">× {c.quantity}</div>
                  <div className="cartPrice">{formatCzk(Number(c.unitPrice) * c.quantity)}</div>
                </div>
              ))}
              <div className="cartTotal">
                <div>Celkem</div>
                <div>{formatCzk(cartTotal)}</div>
              </div>
            </div>
          ) : null}

          <div className="form">
            <label className="field">
              <span>{t('fullName')}</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="field">
              <span>{t('contact')}</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} />
            </label>
            <label className="field">
              <span>{t('delivery')}</span>
              <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}>
                <option value="PICKUP">{t('deliveryPickup')}</option>
                <option value="COURIER">{t('deliveryCourier')}</option>
              </select>
            </label>
            <label className="field">
              <span>{t('note')}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </label>


            <button
              type="button"
              className="primary"
              onClick={() => void placeOrder()}
              disabled={placingOrder || cart.length === 0 || !fullName.trim() || !contact.trim()}
            >
              {placingOrder ? t('submitting') : t('submitOrder')}
            </button>

            {orderResult ? (
              <div className="success">{t('orderSent', { id: orderResult.id })}</div>
            ) : null}
          </div>

          <div className="hint">{t('adminHint')}</div>

        </aside>
      </main>

      <footer className="footer">© {new Date().getFullYear()} HexaTerps</footer>
    </div>
  );
}


export default App;
