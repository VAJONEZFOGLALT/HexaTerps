import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import './Admin.css';
import type {
  Category,
  Cannabinoid,
  CannabinoidUnit,
  Product,
  ProductCannabinoid,
  ProductDevice,
  Strain,
} from './types';
import { api, buildApiUrl } from './api';

type CannabinoidEntry = {
  cannabinoidId: number | string;
  percentage: string;
  unit: CannabinoidUnit;
};

type CategoryMode = 'dropdown' | 'custom';

type ProductForm = {
  name: string;
  categoryId: string;
  categoryCustom: string;
  categoryMode: CategoryMode;
  strain: Strain;
  description: string;
  flavour: string;
  price: string;
  stock: string;
  image: string;
  featured: boolean;
  cannabinoids: CannabinoidEntry[];
  devices: DeviceEntry[];
};

type DeviceEntry = {
  deviceCustom: string;
  price: string;
};

type CategoryDraft = {
  name: string;
  featured: boolean;
};

type ProductFormSetter = Dispatch<SetStateAction<ProductForm>>;

type ProductEditorFieldsProps = {
  form: ProductForm;
  setForm: ProductFormSetter;
  categories: Category[];
  cannabinoids: Cannabinoid[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  onCancel?: () => void;
  cancelLabel?: string;
};

function createDeviceEntry(deviceCustom = '', price = ''): DeviceEntry {
  return { deviceCustom, price };
}

const defaultForm: ProductForm = {
  name: '',
  categoryId: '',
  categoryCustom: '',
  categoryMode: 'dropdown',
  strain: 'HYBRID',
  description: '',
  flavour: '',
  price: '',
  stock: '99',
  image: '',
  featured: false,
  cannabinoids: [],
  devices: [createDeviceEntry()],
};

function formatCannabinoidEntry(entry: ProductCannabinoid): string {
  const suffix = entry.unit === 'MG' ? ' mg' : '%';
  return `${entry.cannabinoid.name} ${entry.percentage}${suffix}`;
}

function formatDeviceEntry(entry: ProductDevice): string {
  return `${entry.device.name} ${entry.price} CZK`;
}

function getDefaultPercentageForCannabinoid(name?: string) {
  if (!name) return '';
  if (name === 'Terpenes') return '5';
  if (name === 'HHC' || name === 'Δ⁹-THC' || name.toUpperCase().includes('D9')) return '95';
  return '';
}

function getDefaultUnitForCannabinoid(): CannabinoidUnit {
  return 'PERCENT';
}

function createCannabinoidEntry(
  cannabinoidId: number | string = '',
  percentage = '',
  unit: CannabinoidUnit = 'PERCENT',
): CannabinoidEntry {
  return { cannabinoidId, percentage, unit };
}

function ProductEditorFields({
  form,
  setForm,
  categories,
  cannabinoids,
  onSubmit,
  submitLabel,
  onCancel,
  cancelLabel = 'Cancel',
}: ProductEditorFieldsProps) {
  function handleAddDevice() {
    setForm((prev) => ({
      ...prev,
      devices: [...prev.devices, createDeviceEntry()],
    }));
  }

  function handleRemoveDevice(idx: number) {
    setForm((prev) => ({
      ...prev,
      devices: prev.devices.filter((_, i) => i !== idx),
    }));
  }

  function handleDeviceChange(idx: number, field: 'deviceCustom' | 'price', value: string) {
    setForm((prev) => {
      const next = [...prev.devices];
      const current = next[idx] ?? createDeviceEntry();
      const updated: DeviceEntry = { ...current, [field]: value } as DeviceEntry;

      next[idx] = updated;
      return { ...prev, devices: next };
    });
  }

  function handleAddCannabinoid() {
    setForm((prev) => ({
      ...prev,
      cannabinoids: [...prev.cannabinoids, createCannabinoidEntry()],
    }));
  }

  function handleRemoveCannabinoid(idx: number) {
    setForm((prev) => ({
      ...prev,
      cannabinoids: prev.cannabinoids.filter((_, i) => i !== idx),
    }));
  }

  function handleCannabinoidChange(idx: number, field: 'cannabinoidId' | 'percentage' | 'unit', value: string) {
    setForm((prev) => {
      const next = [...prev.cannabinoids];
      const current = next[idx] ?? createCannabinoidEntry();
      const updated: CannabinoidEntry = { ...current, [field]: value } as CannabinoidEntry;

      if (field === 'cannabinoidId') {
        const selectedId = Number(value);
        const selected = cannabinoids.find((c) => c.id === selectedId);
        updated.unit = getDefaultUnitForCannabinoid();
        if (!updated.percentage) {
          updated.percentage = getDefaultPercentageForCannabinoid(selected?.name);
        }
      }

      next[idx] = updated;
      return { ...prev, cannabinoids: next };
    });
  }

  return (
    <form onSubmit={onSubmit} className="admin-form">
      <div className="form-group">
        <label>Product Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Optional - leave blank to auto-generate"
        />
      </div>

      <div className="form-group">
        <label>Category</label>
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
          <select value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}>
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
            onChange={(e) => setForm((p) => ({ ...p, categoryCustom: e.target.value }))}
            placeholder="Enter category name, e.g. Equipment"
          />
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Strain</label>
          <select value={form.strain} onChange={(e) => setForm((p) => ({ ...p, strain: e.target.value as Strain }))}>
            <option value="SATIVA">Sativa</option>
            <option value="INDICA">Indica</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>

        <div className="form-group">
          <label>Price (CZK)</label>
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
          <input type="number" min="0" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} />
        </div>
      </div>

      <div className="cannabinoids-section">
        <div className="cannabinoids-header">
          <div>
            <h3>Devices</h3>
            <p className="muted tiny">Add one or more device options and set the price for each one.</p>
          </div>
          <button type="button" onClick={handleAddDevice} className="btn-small">
            + Add Device
          </button>
        </div>

        <div className="cannabinoids-list">
          {form.devices.length === 0 ? (
            <p className="muted">No devices added</p>
          ) : (
            form.devices.map((device, idx) => (
              <div key={idx} className="cannabinoid-entry">
                <input
                  type="text"
                  value={device.deviceCustom}
                  onChange={(e) => handleDeviceChange(idx, 'deviceCustom', e.target.value)}
                  placeholder="Enter device name"
                />

                <input
                  type="number"
                  step="0.01"
                  value={device.price}
                  onChange={(e) => handleDeviceChange(idx, 'price', e.target.value)}
                  placeholder="Price"
                  className="percentage-input"
                />

                <button type="button" onClick={() => handleRemoveDevice(idx)} className="btn-remove" title="Remove device">
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Optional description"
          rows={3}
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
                <select value={cann.cannabinoidId} onChange={(e) => handleCannabinoidChange(idx, 'cannabinoidId', e.target.value)}>
                  <option value="">-- Select --</option>
                  {cannabinoids.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={cann.percentage}
                  onChange={(e) => handleCannabinoidChange(idx, 'percentage', e.target.value)}
                  placeholder="55-65"
                  className="percentage-input"
                />

                <select value={cann.unit} onChange={(e) => handleCannabinoidChange(idx, 'unit', e.target.value)} className="unit-input">
                  <option value="PERCENT">%</option>
                  <option value="MG">mg</option>
                </select>

                <button type="button" onClick={() => handleRemoveCannabinoid(idx)} className="btn-remove" title="Remove cannabinoid">
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function AdminPanel() {
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<number, CategoryDraft>>({});
  const [cannabinoids, setCannabinoids] = useState<Cannabinoid[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [editForm, setEditForm] = useState<ProductForm>(defaultForm);

  useEffect(() => {
    const saved = localStorage.getItem('hexaterps_admin_token');
    if (saved) {
      setAdminToken(saved);
      setIsAuthenticated(true);
    }
  }, []);

  async function loadData() {
    const [cats, cans, prods] = await Promise.all([
      api.getCategories(),
      api.getCannabinoids(),
      api.getProducts(),
    ]);
    setCategories(cats);
    setCategoryDrafts(
      Object.fromEntries(cats.map((category) => [category.id, { name: category.name, featured: category.featured }])),
    );
    setCannabinoids(cans);
    setProducts(prods);
  }

  useEffect(() => {
    if (!isAuthenticated) return;

    void loadData().catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    });
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
    setEditForm(defaultForm);
  }

  function handleCategoryDraftChange(categoryId: number, field: keyof CategoryDraft, value: string | boolean) {
    setCategoryDrafts((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] ?? { name: '', featured: true }),
        [field]: value,
      },
    }));
  }

  async function handleSaveCategory(category: Category) {
    const draft = categoryDrafts[category.id] ?? { name: category.name, featured: category.featured };
    const name = draft.name.trim();

    if (!name) {
      setError('Please enter a category name');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await api.updateCategory(category.id, { name, featured: draft.featured }, adminToken);
      setSuccess(`✅ Category "${name}" updated.`);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update category');
    }
  }

  function resetForm() {
    setForm(defaultForm);
  }

  function closeEditModal() {
    setEditingProductId(null);
    setEditForm(defaultForm);
  }

  async function submitProductForm(productForm: ProductForm, productId: number | null) {
    setError(null);
    setSuccess(null);

    try {
      const categoryCustom = productForm.categoryMode === 'custom' ? productForm.categoryCustom.trim() : '';
      const categoryId = productForm.categoryMode === 'dropdown' ? Number(productForm.categoryId) : undefined;

      if (!productForm.price.trim()) {
        setError('Please fill in the price');
        return;
      }

      if (productForm.categoryMode === 'dropdown' && !categoryId) {
        setError('Please select a category');
        return;
      }

      if (productForm.categoryMode === 'custom' && !categoryCustom) {
        setError('Please enter a custom category name');
        return;
      }

      const normalizedDevices = productForm.devices
        .map((device) => ({
          deviceCustom: device.deviceCustom.trim(),
          price: device.price.trim(),
        }))
        .filter((device) => device.deviceCustom || device.price);

      for (const device of normalizedDevices) {
        if (!device.price) {
          setError('Please fill in each device price');
          return;
        }
        if (!device.deviceCustom) {
          setError('Please enter a device name');
          return;
        }
      }

      const payload = {
        name: productForm.name.trim() || undefined,
        categoryId,
        categoryCustom: categoryCustom || undefined,
        description: productForm.description.trim() || undefined,
        strain: productForm.strain,
        flavour: productForm.flavour.trim() || undefined,
        price: productForm.price,
        stock: Number(productForm.stock) || 0,
        image: productForm.image.trim() || undefined,
        featured: productForm.featured,
        cannabinoids: productForm.cannabinoids
          .filter((c) => c.cannabinoidId && c.percentage.trim())
          .map((c) => ({
            cannabinoidId:
              typeof c.cannabinoidId === 'string' && !Number.isNaN(Number(c.cannabinoidId))
                ? Number(c.cannabinoidId)
                : c.cannabinoidId,
            percentage: c.percentage.trim(),
            unit: c.unit,
          }))
          .filter((c) => c.cannabinoidId),
        devices: normalizedDevices,
      };

      const method = productId ? 'PATCH' : 'POST';
      const url = productId
        ? buildApiUrl(`/api/admin/products/${productId}`)
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
      let productResult: Product | null = null;
      let errorResult: { message?: string } | null = null;

      if (responseText) {
        try {
          productResult = JSON.parse(responseText) as Product;
        } catch {
          errorResult = { message: responseText };
        }
      }

      if (!response.ok) {
        throw new Error(errorResult?.message || responseText || 'Failed to save product');
      }

      if (!productResult || typeof productResult.id !== 'number' || !productResult.name) {
        throw new Error('Unexpected empty response from server');
      }

      const action = productId ? 'updated' : 'created';
      setSuccess(`✅ Product "${productResult.name}" ${action}!`);
      if (productId) {
        closeEditModal();
      } else {
        resetForm();
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitProductForm(form, null);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProductId) return;
    await submitProductForm(editForm, editingProductId);
  }

  function handleEditProduct(product: Product) {
    setEditingProductId(product.id);
    setError(null);
    setSuccess(null);
    setEditForm({
      name: product.name,
      categoryId: String(product.categoryId),
      categoryCustom: '',
      categoryMode: 'dropdown',
      strain: product.strain,
      description: product.description ?? '',
      flavour: product.flavour ?? '',
      price: product.price,
      stock: String(product.stock),
      image: product.image ?? '',
      featured: product.featured,
      cannabinoids: product.cannabinoids.map((c) => createCannabinoidEntry(c.cannabinoidId, c.percentage, c.unit)),
      devices:
        product.devices.length > 0
          ? product.devices.map((device) => createDeviceEntry(device.device.name, device.price))
          : [createDeviceEntry()],
    });
  }

  function handleCloneProduct(product: Product) {
    setEditingProductId(null);
    setError(null);
    setSuccess(null);
    setForm({
      name: `${product.name} (copy)`,
      categoryId: String(product.categoryId),
      categoryCustom: '',
      categoryMode: 'dropdown',
      strain: product.strain,
      description: product.description ?? '',
      flavour: product.flavour ?? '',
      price: product.price,
      stock: String(product.stock),
      image: product.image ?? '',
      featured: product.featured,
      cannabinoids: product.cannabinoids.map((c) => createCannabinoidEntry(c.cannabinoidId, c.percentage, c.unit)),
      devices:
        product.devices.length > 0
          ? product.devices.map((device) => createDeviceEntry(device.device.name, device.price))
          : [createDeviceEntry()],
    });
  }

  async function handleDeleteProduct(product: Product) {
    const confirmed = window.confirm(`Delete product "${product.name}"?`);
    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await api.deleteProduct(product.id, adminToken);
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      setSuccess(`🗑️ Product "${product.name}" deleted.`);
      if (editingProductId === product.id) {
        closeEditModal();
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete product');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-card glass">
          <h1>Admin Access</h1>
          <p className="muted admin-subtitle">Sign in with your admin token.</p>
          <div className="form-group">
            <label>Admin Token</label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Enter your admin token"
            />
          </div>
          {error && <div className="admin-error">{error}</div>}
          <button onClick={handleLogin} className="btn-primary" type="button">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header glass">
        <div>
          <h1>HexaTerps Admin</h1>
          <p className="muted">Manual products, categories, and cannabinoid composition.</p>
        </div>
        <button onClick={handleLogout} className="btn-logout" type="button">
          Logout
        </button>
      </header>

      <main className="admin-shell">
        <div className="admin-column admin-column-left">
          <section className="admin-form-section glass">
            <div className="section-head">
              <div>
                <h2>Create Product</h2>
                <p className="muted">Build a new market listing with cannabinoids, devices, and pricing.</p>
              </div>
              <span className="section-meta">Stock defaults to 99</span>
            </div>
            {error && <div className="admin-error">{error}</div>}
            {success && <div className="admin-success">{success}</div>}

            <ProductEditorFields
              form={form}
              setForm={setForm}
              categories={categories}
              cannabinoids={cannabinoids}
              onSubmit={handleCreateSubmit}
              submitLabel="Create Product"
            />
          </section>

          <section className="admin-categories-section glass">
            <div className="section-head">
              <div>
                <h2>Featured Categories</h2>
                <p className="muted">Control what shows on the homepage and keep category names tidy.</p>
              </div>
              <span className="section-meta">{categories.filter((category) => category.featured).length} featured</span>
            </div>

            <div className="category-admin-grid">
              {categories.map((category) => {
                const draft = categoryDrafts[category.id] ?? { name: category.name, featured: category.featured };

                return (
                  <article key={category.id} className="category-admin-card">
                    <div className="category-admin-head">
                      <strong>{category.name}</strong>
                      <label className="category-switch">
                        <input
                          type="checkbox"
                          checked={draft.featured}
                          onChange={(e) => handleCategoryDraftChange(category.id, 'featured', e.target.checked)}
                        />
                        Featured
                      </label>
                    </div>

                    <label className="category-field">
                      <span>Name</span>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => handleCategoryDraftChange(category.id, 'name', e.target.value)}
                      />
                    </label>

                    <button type="button" className="btn-small" onClick={() => void handleSaveCategory(category)}>
                      Save Category
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="admin-divider" aria-hidden="true" />

        <section className="admin-products-section glass">
          <div className="section-head section-head-tight">
            <div>
              <h2>Products</h2>
              <p className="muted">Edit opens a modal so the create form stays clean.</p>
            </div>
            <span className="section-meta">{products.length} total</span>
          </div>

          {products.length === 0 ? (
            <p className="muted">No products available yet.</p>
          ) : (
            <div className="product-grid">
              {products.map((product) => {
                const cannabinoidText = product.cannabinoids.map(formatCannabinoidEntry).join(' • ');
                const deviceText = product.devices.map(formatDeviceEntry).join(' • ');

                return (
                  <article key={product.id} className="product-card">
                    <div className="product-card-top">
                      <div>
                        <strong>{product.name}</strong>
                        <div className="muted tiny">{product.category?.name}</div>
                      </div>
                      {product.featured ? <span className="badge strong">Featured</span> : null}
                    </div>

                    <div className="product-card-body">
                      {cannabinoidText ? (
                        <div className="muted"><strong>Composition:</strong> {cannabinoidText}</div>
                      ) : (
                        <div className="muted"><strong>Composition:</strong> none</div>
                      )}
                      {product.flavour ? (
                        <div className="muted"><strong>Flavour:</strong> {product.flavour}</div>
                      ) : null}
                      <div className="muted">
                        <strong>Devices:</strong> {deviceText || 'none'}
                      </div>
                      <div className="product-card-defaults">
                        <span>Strain: {product.strain}</span>
                        <span>Price: {product.price} CZK</span>
                        <span>Stock: {product.stock}</span>
                      </div>
                    </div>

                    <div className="product-card-actions">
                      <button type="button" className="btn-small" onClick={() => handleEditProduct(product)}>
                        Edit
                      </button>
                      <button type="button" className="btn-small" onClick={() => handleCloneProduct(product)}>
                        Clone
                      </button>
                      <button type="button" className="btn-danger" onClick={() => void handleDeleteProduct(product)}>
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      {editingProductId !== null ? (
        <div className="admin-modalBackdrop" role="presentation" onClick={closeEditModal}>
          <div className="admin-modal glass" role="dialog" aria-modal="true" aria-label="Edit product" onClick={(e) => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <h2>Edit Product</h2>
                <p className="muted">Update the listing without losing the create form state.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={closeEditModal}>
                Close
              </button>
            </div>

            {error && <div className="admin-error">{error}</div>}
            {success && <div className="admin-success">{success}</div>}

            <ProductEditorFields
              form={editForm}
              setForm={setEditForm}
              categories={categories}
              cannabinoids={cannabinoids}
              onSubmit={handleEditSubmit}
              submitLabel="Save Changes"
              onCancel={closeEditModal}
              cancelLabel="Cancel Edit"
            />
          </div>
        </div>
      ) : null}
      </main>
    </div>
  );
}

export default AdminPanel;
