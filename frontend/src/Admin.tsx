import { useEffect, useState } from 'react';
import './Admin.css';
import type { Category, Cannabinoid } from './types';
import { api } from './api';

type FieldMode = 'dropdown' | 'custom';

type CannabinoidEntry = {
  cannabinoidId: number | string;
  percentage: string;
};

function AdminPanel() {
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cannabinoids, setCannabinoids] = useState<Cannabinoid[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    categoryCustom: '',
    categoryMode: 'dropdown' as FieldMode,
    strain: 'HYBRID' as 'SATIVA' | 'INDICA' | 'HYBRID',
    price: '',
    stock: '0',
    image: '',
    featured: false,
    cannabinoids: [] as CannabinoidEntry[],
  });

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
        const [cats, cans] = await Promise.all([
          api.getCategories(),
          api.getCannabinoids(),
        ]);
        setCategories(cats);
        setCannabinoids(cans);
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
    setForm({
      name: '',
      categoryId: '',
      categoryCustom: '',
      categoryMode: 'dropdown',
      strain: 'HYBRID',
      price: '',
      stock: '0',
      image: '',
      featured: false,
      cannabinoids: [],
    });
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
      newCanns[idx] = { ...newCanns[idx], [field]: value };
      return { ...prev, cannabinoids: newCanns };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const categoryIdForRequest = form.categoryMode === 'custom'
        ? form.categoryCustom
        : form.categoryId;

      if (!form.name || !categoryIdForRequest || !form.price) {
        setError('Please fill in all required fields');
        return;
      }

      const payload = {
        name: form.name,
        categoryId: form.categoryMode === 'custom' ? undefined : Number(form.categoryId),
        categoryCustom: form.categoryMode === 'custom' ? form.categoryCustom : undefined,
        strain: form.strain,
        price: form.price,
        stock: Number(form.stock),
        image: form.image || null,
        featured: form.featured,
        cannabinoids: form.cannabinoids
          .filter((c) => c.cannabinoidId && c.percentage)
          .map((c) => ({
            cannabinoidId:
              typeof c.cannabinoidId === 'string' && !Number.isNaN(Number(c.cannabinoidId))
                ? Number(c.cannabinoidId)
                : undefined,
            percentage: c.percentage,
          }))
          .filter((c) => c.cannabinoidId),
      };

      const response = await fetch('http://localhost:3000/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to create product');
      }

      const created = await response.json();
      setSuccess(`✅ Product "${created.name}" created!`);
      setForm({
        name: '',
        categoryId: '',
        categoryCustom: '',
        categoryMode: 'dropdown',
        strain: 'HYBRID',
        price: '',
        stock: '0',
        image: '',
        featured: false,
        cannabinoids: [],
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

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>🛡️ HexaTerps Admin</h1>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </header>

      <main className="admin-main">
        <section className="admin-form-section">
          <h2>➕ Add New Product</h2>
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
              <div className="field-mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${form.categoryMode === 'dropdown' ? 'active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, categoryMode: 'dropdown' }))}
                >
                  Dropdown
                </button>
                <button
                  type="button"
                  className={`mode-btn ${form.categoryMode === 'custom' ? 'active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, categoryMode: 'custom' }))}
                >
                  Custom
                </button>
              </div>
              {form.categoryMode === 'dropdown' ? (
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
              ) : (
                <input
                  type="text"
                  value={form.categoryCustom}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, categoryCustom: e.target.value }))
                  }
                  placeholder="Enter custom category name"
                  required
                />
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Strain</label>
                <select
                  value={form.strain}
                  onChange={(e) => setForm((p) => ({ ...p, strain: e.target.value as any }))}
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
                ✅ Create Product
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default AdminPanel;
