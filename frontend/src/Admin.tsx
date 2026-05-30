import { useEffect, useState } from 'react';
import './Admin.css';
import type { Category, Cannabinoid, Product, Strain } from './types';
import { api, buildApiUrl } from './api';

type CannabinoidEntry = {
  cannabinoidId: number | string;
  percentage: string;
};

const defaultForm = {
  name: '',
  categoryId: '',
  strain: 'HYBRID' as Strain,
  description: '',
  flavour: '',
  price: '',
  stock: '99',
  image: '',
  featured: false,
  cannabinoids: [] as CannabinoidEntry[],
};

function AdminPanel() {
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cannabinoids, setCannabinoids] = useState<Cannabinoid[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    const saved = localStorage.getItem('hexaterps_admin_token');
    if (saved) {
      setAdminToken(saved);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    async function load() {
      try {
        const [cats, cans, prods] = await Promise.all([
          api.getCategories(),
          api.getCannabinoids(),
          api.getProducts(),
        ]);
        setCategories(cats);
        setCannabinoids(cans);
        setProducts(prods);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      }
    }
    void load();
  }, [isAuthenticated]);

  function handleLogin() {
    if (!adminToken) {
      setError('Please enter admin token');
      return;
    }
    localStorage.setItem('hexaterps_admin_token', adminToken);
    setIsAuthenticated(true);
    setError(null);
  }

  function handleLogout() {
    localStorage.removeItem('hexaterps_admin_token');
    setIsAuthenticated(false);
    setEditingProductId(null);
    setForm(defaultForm);
  }

  function getDefaultPercentageForCannabinoid(name?: string) {
    if (!name) return '';
    if (name === 'Terpenes') return '5';
    if (name === 'HHC' || name === 'Δ⁹-THC' || name.toUpperCase().includes('D9')) return '95';
    return '';
  }

  function resetForm() {
    setEditingProductId(null);
    setError(null);
    setSuccess(null);
    setForm(defaultForm);
  }

  function handleAddCannabinoid() {
    setForm((prev) => ({
      ...prev,
      cannabinoids: [...prev.cannabinoids, { cannabinoidId: '', percentage: '' }],
    }));
  }

  function handleRemoveCannabinoid(idx: number) {
    setForm((prev) => ({
      ...prev,
      cannabinoids: prev.cannabinoids.filter((_, i) => i !== idx),
    }));
  }

  function handleCannabinoidChange(
    idx: number,
    field: 'cannabinoidId' | 'percentage',
    value: string,
  ) {
    setForm((prev) => {
      const newCanns = [...prev.cannabinoids];
      const updatedEntry = { ...newCanns[idx], [field]: value };
      if (field === 'cannabinoidId') {
        const selectedId = Number(value);
        const selected = cannabinoids.find((c) => c.id === selectedId);
        const defaultPct = getDefaultPercentageForCannabinoid(selected?.name);
        if (defaultPct) {
          updatedEntry.percentage = updatedEntry.percentage || defaultPct;
        }
      }
      newCanns[idx] = updatedEntry;
      return { ...prev, cannabinoids: newCanns };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!form.name || !form.categoryId || !form.price) {
        setError('Please fill in all required fields');
        return;
      }

      const payload = {
        name: form.name,
        categoryId: Number(form.categoryId),
        description: form.description || undefined,
        strain: form.strain,
        flavour: form.flavour || undefined,
        price: form.price,
        stock: Number(form.stock),
        image: form.image || undefined,
        featured: form.featured,
        cannabinoids: form.cannabinoids
          .filter((c) => c.cannabinoidId && c.percentage)
          .map((c) => ({
            cannabinoidId:
              typeof c.cannabinoidId === 'string' && !Number.isNaN(Number(c.cannabinoidId))
                ? Number(c.cannabinoidId)
                : c.cannabinoidId,
            percentage: c.percentage,
          }))
          .filter((c) => c.cannabinoidId),
      };

      const method = editingProductId ? 'PATCH' : 'POST';
      const url = editingProductId
        ? buildApiUrl(`/api/admin/products/${editingProductId}`)
        : buildApiUrl('/api/admin/products');

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let result: { name?: string; id?: number; message?: string } | Product | null = null;
      if (responseText) {
        try {
          result = JSON.parse(responseText) as Product;
        } catch {
          result = { message: responseText };
        }
      }
      if (!response.ok) {
        throw new Error(result?.message || responseText || 'Failed to save product');
      }

      if (!result || typeof result.id !== 'number' || !result.name) {
        throw new Error('Unexpected empty response from server');
      }

      const savedProduct = result as Product;

      const action = editingProductId ? 'updated' : 'created';
      setSuccess(`✅ Product "${savedProduct.name}" ${action}!`);
      resetForm();
      setProducts((prev) => {
        if (editingProductId) {
          return prev.map((product) => (product.id === savedProduct.id ? savedProduct : product));
        }
        return [savedProduct, ...prev];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-card">
          <h1>🔐 Admin Access</h1>
          <div>
            <label>Admin Token:</label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Enter your admin token"
            />
          </div>
          {error && <div className="admin-error">{error}</div>}
          <button onClick={handleLogin} className="btn-primary">
            Login
          </button>
        </div>
      </div>
    );
  }

  function handleEditProduct(product: Product) {
    setEditingProductId(product.id);
    setError(null);
    setSuccess(null);
    setForm({
      name: product.name,
      categoryId: String(product.categoryId),
      strain: product.strain,
      description: product.description ?? '',
      flavour: product.flavour ?? '',
      price: product.price,
      stock: String(product.stock),
      image: product.image ?? '',
      featured: product.featured,
      cannabinoids: product.cannabinoids.map((c) => ({
        cannabinoidId: c.cannabinoidId,
        percentage: c.percentage,
      })),
    });
  }

  function handleCloneProduct(product: Product) {
    setEditingProductId(null);
    setError(null);
    setSuccess(null);
    setForm({
      name: `${product.name} (copy)`,
      categoryId: String(product.categoryId),
      strain: product.strain,
      description: product.description ?? '',
      flavour: product.flavour ?? '',
      price: product.price,
      stock: String(product.stock),
      image: product.image ?? '',
      featured: product.featured,
      cannabinoids: product.cannabinoids.map((c) => ({
        cannabinoidId: c.cannabinoidId,
        percentage: c.percentage,
      })),
    });
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>🛡️ HexaTerps Admin</h1>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </header>

      <main className="admin-main">
        <section className="admin-products-section">
          <div className="products-header">
            <h2>📦 Products</h2>
          </div>
          {products.length === 0 ? (
            <p className="muted">No products available yet.</p>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-card-top">
                    <strong>{product.name}</strong>
                    <span>{product.category?.name}</span>
                  </div>
                  <div className="product-card-meta">
                    <span>Price: {product.price} CZK</span>
                    <span>Stock: {product.stock}</span>
                  </div>
                  <div className="product-card-actions">
                    <button
                      type="button"
                      className="btn-small"
                      onClick={() => handleEditProduct(product)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-small"
                      onClick={() => handleCloneProduct(product)}
                    >
                      Clone
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-form-section">
          <h2>{editingProductId ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
          {error && <div className="admin-error">{error}</div>}
          {success && <div className="admin-success">{success}</div>}

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Purple Punch D9"
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                required
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Strain</label>
                <select
                  value={form.strain}
                  onChange={(e) => setForm((p) => ({ ...p, strain: e.target.value as Strain }))}
                >
                  <option value="SATIVA">Sativa</option>
                  <option value="INDICA">Indica</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div className="form-group">
                <label>Price (CZK) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="299.50"
                  required
                />
              </div>

              <div className="form-group">
                <label>Stock</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="form-group">
              <label>Flavour</label>
              <input
                type="text"
                value={form.flavour}
                onChange={(e) => setForm((p) => ({ ...p, flavour: e.target.value }))}
                placeholder="Optional flavour"
              />
            </div>

            <div className="form-group">
              <label>Image URL</label>
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="form-group checkbox">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
                id="featured-check"
              />
              <label htmlFor="featured-check">Featured</label>
            </div>

            <div className="cannabinoids-section">
              <div className="cannabinoids-header">
                <h3>Cannabinoids</h3>
                <button type="button" onClick={handleAddCannabinoid} className="btn-small">
                  + Add
                </button>
              </div>

              <div className="cannabinoids-list">
                {form.cannabinoids.length === 0 ? (
                  <p className="muted">No cannabinoids added</p>
                ) : (
                  form.cannabinoids.map((cann, idx) => (
                    <div key={idx} className="cannabinoid-entry">
                      <select
                        value={cann.cannabinoidId}
                        onChange={(e) =>
                          handleCannabinoidChange(idx, 'cannabinoidId', e.target.value)
                        }
                        required
                      >
                        <option value="">-- Select --</option>
                        {cannabinoids.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={cann.percentage}
                        onChange={(e) =>
                          handleCannabinoidChange(idx, 'percentage', e.target.value)
                        }
                        placeholder="10.5"
                        className="percentage-input"
                        required
                      />
                      <span>%</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCannabinoid(idx)}
                        className="btn-remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingProductId ? '✅ Update Product' : '✅ Create Product'}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default AdminPanel;
