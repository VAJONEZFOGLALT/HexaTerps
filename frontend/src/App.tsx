import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { Category, CreateOrderPayload, DeliveryMethod, Product } from './types';
import { api } from './api';
import { formatCzk } from './money';

type CartItem = {
  product: Product;
  quantity: number;
};

function sumCart(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + Number(item.product.price) * item.quantity, 0);
}

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('PICKUP');
  const [note, setNote] = useState('');
  const [orderResult, setOrderResult] = useState<{ id: number } | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hexaterps.cart');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Array<{ productId: number; quantity: number }>;
      if (!Array.isArray(parsed)) return;
      // Cart will be hydrated after products load.
      localStorage.setItem('hexaterps.cart.pending', JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'hexaterps.cart',
      JSON.stringify(cart.map((c) => ({ productId: c.product.id, quantity: c.quantity }))),
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

        const pending = localStorage.getItem('hexaterps.cart.pending');
        if (pending) {
          try {
            const parsed = JSON.parse(pending) as Array<{ productId: number; quantity: number }>;
            const byId = new Map(prods.map((p) => [p.id, p] as const));
            const hydrated: CartItem[] = parsed
              .map((x) => ({ product: byId.get(x.productId), quantity: x.quantity }))
              .filter((x): x is { product: Product; quantity: number } => Boolean(x.product))
              .map((x) => ({ product: x.product, quantity: Math.max(1, x.quantity) }));
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

  const cartTotal = useMemo(() => sumCart(cart), [cart]);

  function setQuantity(product: Product, quantity: number) {
    const clamped = Math.max(0, Math.min(quantity, Math.max(0, product.stock)));
    setCart((prev) => {
      const existing = prev.find((x) => x.product.id === product.id);
      if (!existing) {
        return clamped <= 0 ? prev : [...prev, { product, quantity: clamped }];
      }
      if (clamped <= 0) return prev.filter((x) => x.product.id !== product.id);
      return prev.map((x) => (x.product.id === product.id ? { ...x, quantity: clamped } : x));
    });
  }

  async function placeOrder() {
    setOrderResult(null);
    setError(null);

    const items = cart.map((c) => ({ productId: c.product.id, quantity: c.quantity }));
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

  return (
    <div className="page">
      <header className="header">
        <div>
          <div className="brand">HexaTerps</div>
          <div className="tagline">MVP webshop • objednávka bez registrace</div>
        </div>
        <div className="headerRight">
          <div className="cartBadge">Košík: {formatCzk(cartTotal)}</div>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <div className="panelTitle">Kategorie</div>
          <button
            className={selectedCategoryId === 'all' ? 'chip active' : 'chip'}
            onClick={() => setSelectedCategoryId('all')}
            type="button"
          >
            Vše
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={selectedCategoryId === c.id ? 'chip active' : 'chip'}
              onClick={() => setSelectedCategoryId(c.id)}
              type="button"
            >
              {c.name}
            </button>
          ))}
        </aside>

        <section className="content">
          <div className="panelTitle">Produkty</div>
          {loading ? <div className="muted">Načítání…</div> : null}
          {error ? <div className="error">{error}</div> : null}
          {!loading && filteredProducts.length === 0 ? (
            <div className="muted">Žádné produkty.</div>
          ) : null}

          <div className="grid">
            {filteredProducts.map((p) => {
              const inCart = cart.find((x) => x.product.id === p.id)?.quantity ?? 0;
              const canAdd = p.stock > inCart;
              const cannabinoidsText = p.cannabinoids
                .map((c) => `${c.cannabinoid.name} ${c.percentage}%`)
                .join(' • ');

              return (
                <article key={p.id} className="card">
                  <div className="cardTop">
                    <div className="cardTitle">{p.name}</div>
                    <div className="badges">
                      <span className="badge">{p.category?.name}</span>
                      <span className="badge">{p.strain.toLowerCase()}</span>
                      {p.featured ? <span className="badge strong">featured</span> : null}
                    </div>
                  </div>

                  {p.description ? <div className="desc">{p.description}</div> : null}
                  {p.flavour ? <div className="muted">Příchuť: {p.flavour}</div> : null}
                  {cannabinoidsText ? <div className="muted">Složení: {cannabinoidsText}</div> : null}

                  <div className="cardBottom">
                    <div className="price">{formatCzk(p.price)}</div>
                    <div className="stock">Sklad: {p.stock}</div>
                    <div className="qty">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setQuantity(p, inCart - 1)}
                        disabled={inCart <= 0}
                      >
                        −
                      </button>
                      <div className="qtyVal">{inCart}</div>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setQuantity(p, inCart + 1)}
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

        <aside className="sidebar">
          <div className="panelTitle">Objednávka</div>
          {cart.length === 0 ? <div className="muted">Košík je prázdný.</div> : null}

          {cart.length > 0 ? (
            <div className="cartList">
              {cart.map((c) => (
                <div key={c.product.id} className="cartRow">
                  <div className="cartName">{c.product.name}</div>
                  <div className="cartQty">× {c.quantity}</div>
                  <div className="cartPrice">{formatCzk(Number(c.product.price) * c.quantity)}</div>
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
              <span>Jméno / přezdívka</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="field">
              <span>Kontakt (chat / tel.)</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} />
            </label>
            <label className="field">
              <span>Doručení</span>
              <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}>
                <option value="PICKUP">Dopravu si udělám sám</option>
                <option value="COURIER">PPL / kurýr</option>
              </select>
            </label>
            <label className="field">
              <span>Poznámka</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </label>

            <button
              type="button"
              className="primary"
              onClick={() => void placeOrder()}
              disabled={placingOrder || cart.length === 0 || !fullName.trim() || !contact.trim()}
            >
              {placingOrder ? 'Odesílám…' : 'Odeslat objednávku'}
            </button>

            {orderResult ? (
              <div className="success">Objednávka odeslána. Číslo: {orderResult.id}</div>
            ) : null}
          </div>

          <div className="hint">
            Admin API je chráněné tokenem (bez registrace). Pro správu produktů použij `Authorization: Bearer ADMIN_TOKEN`.
          </div>
        </aside>
      </main>

      <footer className="footer">© {new Date().getFullYear()} HexaTerps</footer>
    </div>
  );
}

export default App;
