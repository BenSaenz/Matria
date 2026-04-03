const PRODUCTS_STORAGE_KEY = 'matria-products-v2';
const COUPONS_STORAGE_KEY = 'matria-coupons-v2';

const adminState = {
  products: [],
  coupons: [],
  editingProductId: null,
  editingCouponId: null,
  defaults: {
    products: [],
    coupons: []
  }
};

document.addEventListener('DOMContentLoaded', initAdmin);

async function initAdmin() {
  if (document.body.dataset.page !== 'admin') return;

  setupNav();
  bindAdminEvents();
  await loadAdminData();
  renderAllAdmin();
  resetProductForm();
  resetCouponForm();
  initRevealOnScroll();
}

function setupNav() {
  const navToggle = document.getElementById('navToggle');
  const primaryNav = document.getElementById('primaryNav');
  if (!navToggle || !primaryNav) return;

  navToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 820) {
        primaryNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

async function loadAdminData() {
  const [productsDefault, couponsDefault] = await Promise.all([
    fetchJson('assets/data/products.json', []),
    fetchJson('assets/data/coupons.json', [])
  ]);

  adminState.defaults.products = normalizeProducts(productsDefault);
  adminState.defaults.coupons = normalizeCoupons(couponsDefault);
  adminState.products = normalizeProducts(readStorage(PRODUCTS_STORAGE_KEY, adminState.defaults.products));
  adminState.coupons = normalizeCoupons(readStorage(COUPONS_STORAGE_KEY, adminState.defaults.coupons));
}

function bindAdminEvents() {
  document.getElementById('productEditorForm')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('couponEditorForm')?.addEventListener('submit', handleCouponSubmit);
  document.getElementById('addFeatureButton')?.addEventListener('click', () => addFeatureField(''));
  document.getElementById('addMediaButton')?.addEventListener('click', () => addMediaField());
  document.getElementById('resetProductButton')?.addEventListener('click', resetProductForm);
  document.getElementById('deleteProductButton')?.addEventListener('click', deleteEditingProduct);
  document.getElementById('resetCouponButton')?.addEventListener('click', resetCouponForm);
  document.getElementById('deleteCouponButton')?.addEventListener('click', deleteEditingCoupon);
  document.getElementById('discountEnabled')?.addEventListener('change', syncDiscountPanelState);
  document.getElementById('exportProductsButton')?.addEventListener('click', () => exportJson('products.json', adminState.products));
  document.getElementById('exportCouponsButton')?.addEventListener('click', () => exportJson('coupons.json', adminState.coupons));
  document.getElementById('importProductsFile')?.addEventListener('change', event => importJsonFile(event, 'products'));
  document.getElementById('importCouponsFile')?.addEventListener('change', event => importJsonFile(event, 'coupons'));
  document.getElementById('resetAllButton')?.addEventListener('click', resetAllData);
}

function renderAllAdmin() {
  renderStats();
  renderProductsTable();
  renderCouponsTable();
  syncDiscountPanelState();
}

function renderStats() {
  const container = document.getElementById('adminStats');
  if (!container) return;

  const activeDiscounts = adminState.products.filter(product => product.discount?.enabled && Number(product.discount.value) > 0).length;
  const activeCoupons = adminState.coupons.filter(coupon => coupon.active).length;
  const averagePrice = adminState.products.length
    ? adminState.products.reduce((sum, product) => sum + Number(product.price || 0), 0) / adminState.products.length
    : 0;

  container.innerHTML = `
    <article class="admin-stat-card">
      <span class="eyebrow">Productos</span>
      <strong>${adminState.products.length}</strong>
      <p>Total de productos en catálogo local.</p>
    </article>
    <article class="admin-stat-card">
      <span class="eyebrow">Descuentos activos</span>
      <strong>${activeDiscounts}</strong>
      <p>Productos con descuento vigente.</p>
    </article>
    <article class="admin-stat-card">
      <span class="eyebrow">Cupones activos</span>
      <strong>${activeCoupons}</strong>
      <p>Códigos disponibles para el carrito.</p>
    </article>
    <article class="admin-stat-card">
      <span class="eyebrow">Precio promedio</span>
      <strong>${formatCurrency(averagePrice)}</strong>
      <p>Referencia rápida del catálogo.</p>
    </article>
  `;
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (!adminState.products.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay productos cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = adminState.products.map(product => {
    const discountLabel = product.discount?.enabled && Number(product.discount.value) > 0
      ? renderDiscountLabel(product.discount)
      : 'Sin descuento';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(product.name)}</strong><br />
          <span class="assistive">${escapeHtml(product.shortDescription || '')}</span>
        </td>
        <td>${escapeHtml(product.category)}</td>
        <td>${formatCurrency(product.price)}</td>
        <td>${escapeHtml(discountLabel)}</td>
        <td>${formatCurrency(currentPrice(product))}</td>
        <td>
          <div class="admin-actions-inline">
            <button class="btn btn-secondary btn-small" type="button" data-edit-product="${escapeHtml(product.id)}">Editar</button>
            <button class="btn btn-danger btn-small" type="button" data-remove-product="${escapeHtml(product.id)}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-edit-product]').forEach(button => {
    button.addEventListener('click', () => loadProductIntoForm(button.dataset.editProduct));
  });

  tbody.querySelectorAll('[data-remove-product]').forEach(button => {
    button.addEventListener('click', () => deleteProduct(button.dataset.removeProduct));
  });
}

function renderCouponsTable() {
  const tbody = document.getElementById('couponsTableBody');
  if (!tbody) return;

  if (!adminState.coupons.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay cupones cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = adminState.coupons.map(coupon => `
    <tr>
      <td><strong>${escapeHtml(coupon.code)}</strong><br /><span class="assistive">${escapeHtml(coupon.description || '')}</span></td>
      <td>${coupon.type === 'fixed' ? 'Valor fijo' : 'Porcentaje'}</td>
      <td>${coupon.type === 'fixed' ? formatCurrency(coupon.value) : `${coupon.value}%`}</td>
      <td>${coupon.minOrder ? formatCurrency(coupon.minOrder) : '—'}</td>
      <td><span class="status-pill ${coupon.active ? 'active' : 'inactive'}">${coupon.active ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <div class="admin-actions-inline">
          <button class="btn btn-secondary btn-small" type="button" data-edit-coupon="${escapeHtml(coupon.id)}">Editar</button>
          <button class="btn btn-danger btn-small" type="button" data-remove-coupon="${escapeHtml(coupon.id)}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-coupon]').forEach(button => {
    button.addEventListener('click', () => loadCouponIntoForm(button.dataset.editCoupon));
  });

  tbody.querySelectorAll('[data-remove-coupon]').forEach(button => {
    button.addEventListener('click', () => deleteCoupon(button.dataset.removeCoupon));
  });
}

function handleProductSubmit(event) {
  event.preventDefault();
  const product = collectProductFromForm();
  if (!product) return;

  const existingIndex = adminState.products.findIndex(item => item.id === product.id);
  if (existingIndex >= 0) {
    adminState.products[existingIndex] = product;
  } else {
    adminState.products.unshift(product);
  }

  persistProducts();
  renderAllAdmin();
  resetProductForm();
  alert('Producto guardado correctamente.');
}

function collectProductFromForm() {
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value;
  const format = document.getElementById('productFormat').value;
  const price = Number(document.getElementById('productPrice').value || 0);
  const badge = document.getElementById('productBadge').value.trim();
  const shortDescription = document.getElementById('productShortDescription').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const discountEnabled = document.getElementById('discountEnabled').checked;
  const discountType = document.getElementById('discountType').value;
  const discountValue = Number(document.getElementById('discountValue').value || 0);
  const rawId = document.getElementById('productId').value.trim();

  if (!name || !price) {
    alert('Completa al menos nombre y precio.');
    return null;
  }

  const features = [...document.querySelectorAll('.feature-input')]
    .map(input => input.value.trim())
    .filter(Boolean);

  const media = [...document.querySelectorAll('.media-item')].map(item => {
    const type = item.querySelector('.media-type').value;
    const src = item.querySelector('.media-src').value.trim();
    const alt = item.querySelector('.media-alt').value.trim();
    return src ? { type, src, alt } : null;
  }).filter(Boolean);

  return normalizeProducts([{
    id: rawId || slugify(name),
    name,
    category,
    format,
    price,
    badge,
    shortDescription,
    description,
    features,
    media,
    discount: {
      enabled: discountEnabled && discountValue > 0,
      type: discountType,
      value: discountValue
    }
  }])[0];
}

function loadProductIntoForm(productId) {
  const product = adminState.products.find(item => item.id === productId);
  if (!product) return;

  adminState.editingProductId = product.id;
  document.getElementById('productFormTitle').textContent = `Editar producto: ${product.name}`;
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productFormat').value = product.format;
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productBadge').value = product.badge || '';
  document.getElementById('productShortDescription').value = product.shortDescription || '';
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('discountEnabled').checked = Boolean(product.discount?.enabled && Number(product.discount.value) > 0);
  document.getElementById('discountType').value = product.discount?.type || 'percent';
  document.getElementById('discountValue').value = Number(product.discount?.value || 0);

  const featuresList = document.getElementById('featuresList');
  const mediaList = document.getElementById('mediaList');
  featuresList.innerHTML = '';
  mediaList.innerHTML = '';

  if (product.features.length) {
    product.features.forEach(feature => addFeatureField(feature));
  } else {
    addFeatureField('');
  }

  if (product.media.length) {
    product.media.forEach(media => addMediaField(media));
  } else {
    addMediaField();
  }

  document.getElementById('deleteProductButton').disabled = false;
  syncDiscountPanelState();
  window.scrollTo({ top: document.getElementById('productos').offsetTop - 90, behavior: 'smooth' });
}

function resetProductForm() {
  adminState.editingProductId = null;
  document.getElementById('productEditorForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productFormTitle').textContent = 'Crear producto';
  document.getElementById('deleteProductButton').disabled = true;
  const featuresList = document.getElementById('featuresList');
  const mediaList = document.getElementById('mediaList');
  featuresList.innerHTML = '';
  mediaList.innerHTML = '';
  addFeatureField('');
  addMediaField();
  syncDiscountPanelState();
}

function deleteEditingProduct() {
  if (!adminState.editingProductId) return;
  deleteProduct(adminState.editingProductId);
}

function deleteProduct(productId) {
  const product = adminState.products.find(item => item.id === productId);
  if (!product) return;
  if (!confirm(`¿Eliminar el producto "${product.name}"?`)) return;
  adminState.products = adminState.products.filter(item => item.id !== productId);
  persistProducts();
  renderAllAdmin();
  if (adminState.editingProductId === productId) resetProductForm();
}

function handleCouponSubmit(event) {
  event.preventDefault();
  const coupon = collectCouponFromForm();
  if (!coupon) return;

  const existingIndex = adminState.coupons.findIndex(item => item.id === coupon.id);
  if (existingIndex >= 0) {
    adminState.coupons[existingIndex] = coupon;
  } else {
    adminState.coupons.unshift(coupon);
  }

  persistCoupons();
  renderAllAdmin();
  resetCouponForm();
  alert('Cupón guardado correctamente.');
}

function collectCouponFromForm() {
  const rawId = document.getElementById('couponId').value.trim();
  const code = document.getElementById('couponCode').value.trim().toUpperCase();
  const type = document.getElementById('couponType').value;
  const value = Number(document.getElementById('couponValue').value || 0);
  const minOrder = Number(document.getElementById('couponMinOrder').value || 0);
  const description = document.getElementById('couponDescription').value.trim();
  const active = document.getElementById('couponStatus').value === 'true';

  if (!code || !value) {
    alert('Completa código y valor del cupón.');
    return null;
  }

  return normalizeCoupons([{
    id: rawId || slugify(code),
    code,
    type,
    value,
    minOrder,
    description,
    active
  }])[0];
}

function loadCouponIntoForm(couponId) {
  const coupon = adminState.coupons.find(item => item.id === couponId);
  if (!coupon) return;

  adminState.editingCouponId = coupon.id;
  document.getElementById('couponFormTitle').textContent = `Editar cupón: ${coupon.code}`;
  document.getElementById('couponId').value = coupon.id;
  document.getElementById('couponCode').value = coupon.code;
  document.getElementById('couponType').value = coupon.type;
  document.getElementById('couponValue').value = coupon.value;
  document.getElementById('couponMinOrder').value = coupon.minOrder || '';
  document.getElementById('couponDescription').value = coupon.description || '';
  document.getElementById('couponStatus').value = String(coupon.active);
  document.getElementById('deleteCouponButton').disabled = false;
  window.scrollTo({ top: document.getElementById('cupones').offsetTop - 90, behavior: 'smooth' });
}

function resetCouponForm() {
  adminState.editingCouponId = null;
  document.getElementById('couponEditorForm').reset();
  document.getElementById('couponId').value = '';
  document.getElementById('couponFormTitle').textContent = 'Crear cupón';
  document.getElementById('couponStatus').value = 'true';
  document.getElementById('deleteCouponButton').disabled = true;
}

function deleteEditingCoupon() {
  if (!adminState.editingCouponId) return;
  deleteCoupon(adminState.editingCouponId);
}

function deleteCoupon(couponId) {
  const coupon = adminState.coupons.find(item => item.id === couponId);
  if (!coupon) return;
  if (!confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;
  adminState.coupons = adminState.coupons.filter(item => item.id !== couponId);
  persistCoupons();
  renderAllAdmin();
  if (adminState.editingCouponId === couponId) resetCouponForm();
}

function addFeatureField(value = '') {
  const list = document.getElementById('featuresList');
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-row">
      <input class="feature-input" type="text" placeholder="Ej. Cera vegetal, mecha de algodón" value="${escapeHtml(value)}" />
      <button class="btn btn-danger btn-small" type="button">Quitar</button>
    </div>
  `;
  wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
  list.appendChild(wrapper);
}

function addMediaField(media = { type: 'image', src: '', alt: '' }) {
  const list = document.getElementById('mediaList');
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item media-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-grid">
      <div class="field">
        <label>Tipo</label>
        <select class="media-type">
          <option value="image" ${media.type === 'image' ? 'selected' : ''}>Imagen</option>
          <option value="video" ${media.type === 'video' ? 'selected' : ''}>Video</option>
        </select>
      </div>
      <div class="field">
        <label>URL o ruta</label>
        <input class="media-src" type="text" placeholder="/assets/img/products/vela/01.jpg" value="${escapeHtml(media.src || '')}" />
      </div>
      <div class="field">
        <label>Texto alternativo</label>
        <input class="media-alt" type="text" placeholder="Descripción breve" value="${escapeHtml(media.alt || '')}" />
      </div>
      <button class="btn btn-danger btn-small" type="button">Quitar</button>
    </div>
  `;
  wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
  list.appendChild(wrapper);
}

function syncDiscountPanelState() {
  const enabled = document.getElementById('discountEnabled')?.checked;
  const panel = document.getElementById('discountPanel');
  if (!panel) return;
  panel.classList.toggle('is-disabled', !enabled);
}

function exportJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function importJsonFile(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (type === 'products') {
        adminState.products = normalizeProducts(data);
        persistProducts();
        resetProductForm();
      } else {
        adminState.coupons = normalizeCoupons(data);
        persistCoupons();
        resetCouponForm();
      }
      renderAllAdmin();
      alert(`${type === 'products' ? 'Productos' : 'Cupones'} importados correctamente.`);
      event.target.value = '';
    } catch {
      alert('El archivo JSON no tiene un formato válido.');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm('Se restaurarán los datos base del proyecto y se limpiarán los cambios locales. ¿Deseas continuar?')) return;
  localStorage.removeItem(PRODUCTS_STORAGE_KEY);
  localStorage.removeItem(COUPONS_STORAGE_KEY);
  adminState.products = [...adminState.defaults.products];
  adminState.coupons = [...adminState.defaults.coupons];
  persistProducts();
  persistCoupons();
  resetProductForm();
  resetCouponForm();
  renderAllAdmin();
}

function persistProducts() {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(adminState.products));
}

function persistCoupons() {
  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(adminState.coupons));
}

function normalizeProducts(list) {
  return (Array.isArray(list) ? list : []).map(product => ({
    id: product.id || slugify(product.name || `producto-${Date.now()}`),
    name: product.name || 'Producto sin nombre',
    category: product.category || 'Velas',
    format: product.format || 'ritual',
    price: Number(product.price || 0),
    badge: product.badge || '',
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    features: Array.isArray(product.features) ? product.features.filter(Boolean) : [],
    media: Array.isArray(product.media) ? product.media.filter(item => item && item.src) : [],
    discount: {
      enabled: Boolean(product.discount?.enabled),
      type: product.discount?.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(product.discount?.value || 0)
    }
  }));
}

function normalizeCoupons(list) {
  return (Array.isArray(list) ? list : []).map(coupon => ({
    id: coupon.id || slugify(coupon.code || `coupon-${Date.now()}`),
    code: (coupon.code || '').toUpperCase(),
    type: coupon.type === 'fixed' ? 'fixed' : 'percent',
    value: Number(coupon.value || 0),
    minOrder: Number(coupon.minOrder || 0),
    description: coupon.description || '',
    active: coupon.active !== false
  }));
}

function currentPrice(product) {
  const base = Number(product.price || 0);
  const discount = product.discount;
  if (!discount || !discount.enabled || Number(discount.value) <= 0) return Number(base.toFixed(2));
  const amount = discount.type === 'fixed' ? Number(discount.value) : base * (Number(discount.value) / 100);
  return Number(Math.max(base - amount, 0).toFixed(2));
}

function renderDiscountLabel(discount) {
  if (!discount || !discount.enabled || Number(discount.value) <= 0) return 'Sin descuento';
  return discount.type === 'fixed' ? `-${formatCurrency(discount.value)}` : `-${discount.value}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar');
    return await response.json();
  } catch {
    return fallback;
  }
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function initRevealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });

  items.forEach(item => {
    if (!item.classList.contains('in-view')) observer.observe(item);
  });
}
