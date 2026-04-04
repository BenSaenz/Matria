const COLLECTIONS_STORAGE_KEY = 'matria-collections-v3';
const PRODUCTS_STORAGE_KEY = 'matria-products-v3';
const COUPONS_STORAGE_KEY = 'matria-coupons-v3';

const adminState = {
  collections: [],
  products: [],
  coupons: [],
  editingCollectionId: null,
  editingProductId: null,
  editingCouponId: null,
  defaults: {
    collections: [],
    products: [],
    coupons: []
  }
};

document.addEventListener('DOMContentLoaded', initAdmin);

async function initAdmin() {
  if (document.body.dataset.page !== 'admin') return;

  setupNav();
  await loadAdminData();
  bindAdminEvents();
  renderAllAdmin();
  resetCollectionForm();
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
  const [collectionsDefault, productsDefault, couponsDefault] = await Promise.all([
    fetchJson('assets/data/collections.json', []),
    fetchJson('assets/data/products.json', []),
    fetchJson('assets/data/coupons.json', [])
  ]);

  adminState.defaults.collections = normalizeCollections(collectionsDefault);
  adminState.defaults.products = normalizeProducts(productsDefault);
  adminState.defaults.coupons = normalizeCoupons(couponsDefault);

  adminState.collections = normalizeCollections(readStorage(COLLECTIONS_STORAGE_KEY, null) || collectionsDefault);
  adminState.products = normalizeProducts(readStorage(PRODUCTS_STORAGE_KEY, null) || productsDefault);
  adminState.coupons = normalizeCoupons(readStorage(COUPONS_STORAGE_KEY, null) || couponsDefault);
}

function bindAdminEvents() {
  document.getElementById('collectionEditorForm')?.addEventListener('submit', handleCollectionSubmit);
  document.getElementById('resetCollectionButton')?.addEventListener('click', resetCollectionForm);
  document.getElementById('deleteCollectionButton')?.addEventListener('click', deleteEditingCollection);
  document.getElementById('addCollectionMediaButton')?.addEventListener('click', () => addMediaField(document.getElementById('collectionMediaList')));

  document.getElementById('productEditorForm')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('resetProductButton')?.addEventListener('click', resetProductForm);
  document.getElementById('deleteProductButton')?.addEventListener('click', deleteEditingProduct);
  document.getElementById('addDescriptionButton')?.addEventListener('click', () => addTextField(document.getElementById('descriptionsList'), 'description-input', 'Bloque descriptivo del producto'));
  document.getElementById('addFeatureButton')?.addEventListener('click', () => addTextField(document.getElementById('featuresList'), 'feature-input', 'Característica del producto'));
  document.getElementById('addMediaButton')?.addEventListener('click', () => addMediaField(document.getElementById('mediaList')));
  document.getElementById('discountEnabled')?.addEventListener('change', syncDiscountPanelState);

  document.getElementById('couponEditorForm')?.addEventListener('submit', handleCouponSubmit);
  document.getElementById('resetCouponButton')?.addEventListener('click', resetCouponForm);
  document.getElementById('deleteCouponButton')?.addEventListener('click', deleteEditingCoupon);

  document.getElementById('exportCollectionsButton')?.addEventListener('click', () => exportJson('collections.json', adminState.collections));
  document.getElementById('exportProductsButton')?.addEventListener('click', () => exportJson('products.json', adminState.products));
  document.getElementById('exportCouponsButton')?.addEventListener('click', () => exportJson('coupons.json', adminState.coupons));

  document.getElementById('importCollectionsInput')?.addEventListener('change', event => importJsonFile(event, 'collections'));
  document.getElementById('importProductsInput')?.addEventListener('change', event => importJsonFile(event, 'products'));
  document.getElementById('importCouponsInput')?.addEventListener('change', event => importJsonFile(event, 'coupons'));

  document.getElementById('resetAllDataButton')?.addEventListener('click', resetAllData);
}

function renderAllAdmin() {
  renderStats();
  renderCollectionsTable();
  renderProductsTable();
  renderCouponsTable();
  populateCollectionSelect();
  syncDiscountPanelState();
}

function renderStats() {
  const container = document.getElementById('adminStats');
  if (!container) return;

  const activeDiscounts = adminState.products.filter(product => product.discount?.enabled && Number(product.discount.value) > 0).length;
  const activeCoupons = adminState.coupons.filter(coupon => coupon.active).length;
  const activeCollections = adminState.collections.filter(collection => collection.active).length;
  const visibleCollections = adminState.collections.filter(collection => collection.showOnHome && collection.active).length;

  container.innerHTML = `
    <article class="admin-stat-card">
      <span class="eyebrow">Colecciones</span>
      <strong>${activeCollections}</strong>
      <p>${visibleCollections} visibles en home.</p>
    </article>
    <article class="admin-stat-card">
      <span class="eyebrow">Productos</span>
      <strong>${adminState.products.length}</strong>
      <p>Catálogo local administrable.</p>
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
  `;
}

function renderCollectionsTable() {
  const tbody = document.getElementById('collectionsTableBody');
  if (!tbody) return;

  if (!adminState.collections.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay colecciones cargadas.</td></tr>';
    return;
  }

  const rows = [...adminState.collections].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name, 'es'));
  tbody.innerHTML = rows.map(collection => {
    const productCount = adminState.products.filter(product => product.collectionId === collection.id).length;
    return `
      <tr>
        <td><strong>${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}</strong><br /><span class="assistive">${escapeHtml(collection.tagline || '')}</span></td>
        <td>${Number(collection.sortOrder || 0)}</td>
        <td><span class="status-pill ${collection.active ? 'active' : 'inactive'}">${collection.active ? 'Activa' : 'Inactiva'}</span></td>
        <td>${collection.showOnHome ? 'Sí' : 'No'}</td>
        <td>${productCount}</td>
        <td>
          <div class="admin-actions-inline">
            <button class="btn btn-secondary btn-small" type="button" data-edit-collection="${escapeHtml(collection.id)}">Editar</button>
            <button class="btn btn-danger btn-small" type="button" data-remove-collection="${escapeHtml(collection.id)}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-edit-collection]').forEach(button => {
    button.addEventListener('click', () => loadCollectionIntoForm(button.dataset.editCollection));
  });
  tbody.querySelectorAll('[data-remove-collection]').forEach(button => {
    button.addEventListener('click', () => deleteCollection(button.dataset.removeCollection));
  });
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (!adminState.products.length) {
    tbody.innerHTML = '<tr><td colspan="7">No hay productos cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = adminState.products.map(product => {
    const discountLabel = product.discount?.enabled && Number(product.discount.value) > 0
      ? renderDiscountLabel(product.discount)
      : 'Sin descuento';
    const collection = getCollectionById(product.collectionId);

    return `
      <tr>
        <td><strong>${escapeHtml(product.name)}</strong><br /><span class="assistive">${escapeHtml(product.shortDescription || '')}</span></td>
        <td>${escapeHtml(collection?.name || '—')}</td>
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

  tbody.querySelectorAll('[data-edit-product]').forEach(button => button.addEventListener('click', () => loadProductIntoForm(button.dataset.editProduct)));
  tbody.querySelectorAll('[data-remove-product]').forEach(button => button.addEventListener('click', () => deleteProduct(button.dataset.removeProduct)));
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

  tbody.querySelectorAll('[data-edit-coupon]').forEach(button => button.addEventListener('click', () => loadCouponIntoForm(button.dataset.editCoupon)));
  tbody.querySelectorAll('[data-remove-coupon]').forEach(button => button.addEventListener('click', () => deleteCoupon(button.dataset.removeCoupon)));
}

function populateCollectionSelect() {
  const select = document.getElementById('productCollection');
  if (!select) return;
  const activeCollections = adminState.collections.filter(collection => collection.active);
  select.innerHTML = activeCollections.map(collection => `<option value="${escapeHtml(collection.id)}">${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}</option>`).join('');
}

function handleCollectionSubmit(event) {
  event.preventDefault();
  const collection = collectCollectionFromForm();
  if (!collection) return;

  const existingIndex = adminState.collections.findIndex(item => item.id === collection.id);
  if (existingIndex >= 0) {
    adminState.collections[existingIndex] = collection;
  } else {
    adminState.collections.push(collection);
  }

  adminState.collections.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name, 'es'));
  persistCollections();
  renderAllAdmin();
  resetCollectionForm();
  alert('Colección guardada correctamente.');
}

function collectCollectionFromForm() {
  const rawId = document.getElementById('collectionId').value.trim();
  const code = document.getElementById('collectionCode').value.trim();
  const name = document.getElementById('collectionName').value.trim();
  const tagline = document.getElementById('collectionTagline').value.trim();
  const story = document.getElementById('collectionStory').value.trim();
  const packName = document.getElementById('collectionPackName').value.trim();
  const packStory = document.getElementById('collectionPackStory').value.trim();
  const ctaLabel = document.getElementById('collectionCtaLabel').value.trim();
  const sortOrder = Number(document.getElementById('collectionOrder').value || 0);
  const active = document.getElementById('collectionStatus').value === 'true';
  const featured = document.getElementById('collectionFeatured').checked;
  const showOnHome = document.getElementById('collectionShowOnHome').checked;

  if (!name) {
    alert('Completa al menos el nombre de la colección.');
    return null;
  }

  const media = collectMediaFromList(document.getElementById('collectionMediaList'));

  return normalizeCollections([{
    id: rawId || slugify(name),
    code,
    name,
    title: name,
    tagline,
    story,
    packName,
    packStory,
    ctaLabel,
    sortOrder,
    active,
    featured,
    showOnHome,
    media
  }])[0];
}

function loadCollectionIntoForm(collectionId) {
  const collection = adminState.collections.find(item => item.id === collectionId);
  if (!collection) return;

  adminState.editingCollectionId = collection.id;
  document.getElementById('collectionFormTitle').textContent = `Editar colección: ${collection.name}`;
  document.getElementById('collectionId').value = collection.id;
  document.getElementById('collectionCode').value = collection.code || '';
  document.getElementById('collectionName').value = collection.name;
  document.getElementById('collectionTagline').value = collection.tagline || '';
  document.getElementById('collectionStory').value = collection.story || '';
  document.getElementById('collectionPackName').value = collection.packName || '';
  document.getElementById('collectionPackStory').value = collection.packStory || '';
  document.getElementById('collectionCtaLabel').value = collection.ctaLabel || '';
  document.getElementById('collectionOrder').value = collection.sortOrder || 0;
  document.getElementById('collectionStatus').value = String(collection.active);
  document.getElementById('collectionFeatured').checked = Boolean(collection.featured);
  document.getElementById('collectionShowOnHome').checked = collection.showOnHome !== false;

  const mediaList = document.getElementById('collectionMediaList');
  mediaList.innerHTML = '';
  if (collection.media.length) {
    collection.media.forEach(media => addMediaField(mediaList, media));
  } else {
    addMediaField(mediaList);
  }

  document.getElementById('deleteCollectionButton').disabled = false;
  window.scrollTo({ top: document.getElementById('colecciones-admin').offsetTop - 90, behavior: 'smooth' });
}

function resetCollectionForm() {
  adminState.editingCollectionId = null;
  document.getElementById('collectionEditorForm')?.reset();
  document.getElementById('collectionFormTitle').textContent = 'Crear colección';
  document.getElementById('collectionId').value = '';
  document.getElementById('collectionStatus').value = 'true';
  document.getElementById('collectionShowOnHome').checked = true;
  document.getElementById('deleteCollectionButton').disabled = true;
  const mediaList = document.getElementById('collectionMediaList');
  mediaList.innerHTML = '';
  addMediaField(mediaList, { type: 'image', src: '', alt: '', title: '', caption: '' });
}

function deleteEditingCollection() {
  if (!adminState.editingCollectionId) return;
  deleteCollection(adminState.editingCollectionId);
}

function deleteCollection(collectionId) {
  const collection = adminState.collections.find(item => item.id === collectionId);
  if (!collection) return;

  const linkedProducts = adminState.products.filter(product => product.collectionId === collectionId);
  if (linkedProducts.length) {
    alert(`No puedes eliminar la colección "${collection.name}" porque tiene ${linkedProducts.length} producto(s) enlazado(s). Reasigna o elimina esos productos primero.`);
    return;
  }

  if (!confirm(`¿Eliminar la colección "${collection.name}"?`)) return;
  adminState.collections = adminState.collections.filter(item => item.id !== collectionId);
  persistCollections();
  renderAllAdmin();
  if (adminState.editingCollectionId === collectionId) resetCollectionForm();
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
  const rawId = document.getElementById('productId').value.trim();
  const collectionId = document.getElementById('productCollection').value;
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value;
  const format = document.getElementById('productFormat').value;
  const price = Number(document.getElementById('productPrice').value || 0);
  const badge = document.getElementById('productBadge').value.trim();
  const technicalBlend = document.getElementById('productTechnicalBlend').value.trim();
  const salesSpeech = document.getElementById('productSalesSpeech').value.trim();
  const shortDescription = document.getElementById('productShortDescription').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const discountEnabled = document.getElementById('discountEnabled').checked;
  const discountType = document.getElementById('discountType').value;
  const discountValue = Number(document.getElementById('discountValue').value || 0);

  if (!collectionId || !name || !price) {
    alert('Completa al menos colección, nombre y precio.');
    return null;
  }

  const descriptions = collectTextList(document.getElementById('descriptionsList'), '.description-input');
  const features = collectTextList(document.getElementById('featuresList'), '.feature-input');
  const media = collectMediaFromList(document.getElementById('mediaList'));

  return normalizeProducts([{
    id: rawId || slugify(name),
    collectionId,
    name,
    category,
    format,
    price,
    badge,
    technicalBlend,
    salesSpeech,
    shortDescription,
    description,
    descriptions,
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
  document.getElementById('productCollection').value = product.collectionId;
  document.getElementById('productName').value = product.name;
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productFormat').value = product.format;
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productBadge').value = product.badge || '';
  document.getElementById('productTechnicalBlend').value = product.technicalBlend || '';
  document.getElementById('productSalesSpeech').value = product.salesSpeech || '';
  document.getElementById('productShortDescription').value = product.shortDescription || '';
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('discountEnabled').checked = Boolean(product.discount?.enabled && Number(product.discount.value) > 0);
  document.getElementById('discountType').value = product.discount?.type || 'percent';
  document.getElementById('discountValue').value = Number(product.discount?.value || 0);

  const descriptionsList = document.getElementById('descriptionsList');
  const featuresList = document.getElementById('featuresList');
  const mediaList = document.getElementById('mediaList');
  descriptionsList.innerHTML = '';
  featuresList.innerHTML = '';
  mediaList.innerHTML = '';

  (product.descriptions.length ? product.descriptions : ['']).forEach(text => addTextField(descriptionsList, 'description-input', 'Bloque descriptivo del producto', text));
  (product.features.length ? product.features : ['']).forEach(text => addTextField(featuresList, 'feature-input', 'Característica del producto', text));
  (product.media.length ? product.media : [{ type: 'image', src: '', alt: '', title: '', caption: '' }]).forEach(media => addMediaField(mediaList, media));

  document.getElementById('deleteProductButton').disabled = false;
  syncDiscountPanelState();
  window.scrollTo({ top: document.getElementById('productos').offsetTop - 90, behavior: 'smooth' });
}

function resetProductForm() {
  adminState.editingProductId = null;
  document.getElementById('productEditorForm')?.reset();
  document.getElementById('productId').value = '';
  document.getElementById('productFormTitle').textContent = 'Crear producto';
  document.getElementById('deleteProductButton').disabled = true;
  const descriptionsList = document.getElementById('descriptionsList');
  const featuresList = document.getElementById('featuresList');
  const mediaList = document.getElementById('mediaList');
  descriptionsList.innerHTML = '';
  featuresList.innerHTML = '';
  mediaList.innerHTML = '';
  addTextField(descriptionsList, 'description-input', 'Bloque descriptivo del producto');
  addTextField(featuresList, 'feature-input', 'Característica del producto');
  addMediaField(mediaList, { type: 'image', src: '', alt: '', title: '', caption: '' });
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
  document.getElementById('couponEditorForm')?.reset();
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

function addTextField(list, inputClass, placeholder, value = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-row">
      <input class="${inputClass}" type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" />
      <button class="btn btn-danger btn-small" type="button">Quitar</button>
    </div>
  `;
  wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
  list.appendChild(wrapper);
}

function addMediaField(list, media = { type: 'image', src: '', alt: '', title: '', caption: '' }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item media-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-grid media-grid-extended">
      <div class="field">
        <label>Tipo</label>
        <select class="media-type">
          <option value="image" ${media.type === 'image' ? 'selected' : ''}>Imagen</option>
          <option value="video" ${media.type === 'video' ? 'selected' : ''}>Video</option>
        </select>
      </div>
      <div class="field field-span-2">
        <label>Ruta relativa</label>
        <input class="media-src" type="text" placeholder="assets/img/products/amanecer-interno/01.webp" value="${escapeHtml(media.src || '')}" />
      </div>
      <div class="field">
        <label>Alt</label>
        <input class="media-alt" type="text" placeholder="Descripción breve accesible" value="${escapeHtml(media.alt || '')}" />
      </div>
      <div class="field">
        <label>Title</label>
        <input class="media-title" type="text" placeholder="Título interno o tooltip" value="${escapeHtml(media.title || '')}" />
      </div>
      <div class="field field-span-2">
        <label>Caption</label>
        <input class="media-caption" type="text" placeholder="Pie de imagen opcional" value="${escapeHtml(media.caption || '')}" />
      </div>
      <button class="btn btn-danger btn-small align-self-end" type="button">Quitar</button>
    </div>
  `;
  wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
  list.appendChild(wrapper);
}

function collectTextList(list, selector) {
  return [...list.querySelectorAll(selector)].map(input => input.value.trim()).filter(Boolean);
}

function collectMediaFromList(list) {
  return [...list.querySelectorAll('.media-item')].map(item => {
    const type = item.querySelector('.media-type').value;
    const src = item.querySelector('.media-src').value.trim();
    const alt = item.querySelector('.media-alt').value.trim();
    const title = item.querySelector('.media-title').value.trim();
    const caption = item.querySelector('.media-caption').value.trim();
    return src ? { type, src, alt, title, caption } : null;
  }).filter(Boolean);
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
      if (type === 'collections') {
        adminState.collections = normalizeCollections(data);
        persistCollections();
        resetCollectionForm();
      } else if (type === 'products') {
        adminState.products = normalizeProducts(data);
        persistProducts();
        resetProductForm();
      } else {
        adminState.coupons = normalizeCoupons(data);
        persistCoupons();
        resetCouponForm();
      }
      renderAllAdmin();
      alert(`${type === 'collections' ? 'Colecciones' : type === 'products' ? 'Productos' : 'Cupones'} importados correctamente.`);
      event.target.value = '';
    } catch {
      alert('El archivo JSON no tiene un formato válido.');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm('Se restaurarán los datos base del proyecto y se limpiarán los cambios locales. ¿Deseas continuar?')) return;
  localStorage.removeItem(COLLECTIONS_STORAGE_KEY);
  localStorage.removeItem(PRODUCTS_STORAGE_KEY);
  localStorage.removeItem(COUPONS_STORAGE_KEY);
  adminState.collections = [...adminState.defaults.collections];
  adminState.products = [...adminState.defaults.products];
  adminState.coupons = [...adminState.defaults.coupons];
  persistCollections();
  persistProducts();
  persistCoupons();
  resetCollectionForm();
  resetProductForm();
  resetCouponForm();
  renderAllAdmin();
}

function persistCollections() {
  localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(adminState.collections));
}

function persistProducts() {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(adminState.products));
}

function persistCoupons() {
  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(adminState.coupons));
}

function normalizeCollections(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    id: item.id || slugify(item.name || `collection-${Date.now()}`),
    code: item.code || '',
    name: item.name || 'Colección sin nombre',
    title: item.title || item.name || 'Colección',
    tagline: item.tagline || '',
    story: item.story || '',
    packName: item.packName || '',
    packStory: item.packStory || '',
    ctaLabel: item.ctaLabel || 'Ver colección',
    featured: Boolean(item.featured),
    showOnHome: item.showOnHome !== false,
    sortOrder: Number(item.sortOrder || 0),
    active: item.active !== false,
    media: normalizeMedia(item.media)
  }));
}

function normalizeProducts(list) {
  return (Array.isArray(list) ? list : []).map(product => ({
    id: product.id || slugify(product.name || `producto-${Date.now()}`),
    collectionId: product.collectionId || '',
    name: product.name || 'Producto sin nombre',
    category: product.category || 'Vela Pote',
    format: product.format || 'ritual',
    price: Number(product.price || 0),
    badge: product.badge || '',
    technicalBlend: product.technicalBlend || '',
    salesSpeech: product.salesSpeech || '',
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    descriptions: Array.isArray(product.descriptions) ? product.descriptions.filter(Boolean) : [],
    features: Array.isArray(product.features) ? product.features.filter(Boolean) : [],
    media: normalizeMedia(product.media),
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

function normalizeMedia(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    type: item?.type === 'video' ? 'video' : 'image',
    src: item?.src || '',
    alt: item?.alt || '',
    title: item?.title || '',
    caption: item?.caption || ''
  })).filter(item => item.src);
}

function getCollectionById(collectionId) {
  return adminState.collections.find(collection => collection.id === collectionId) || null;
}

function currentPrice(product) {
  const base = Number(product.price || 0);
  if (!product.discount?.enabled || Number(product.discount.value) <= 0) return Number(base.toFixed(2));
  const amount = product.discount.type === 'fixed'
    ? Number(product.discount.value || 0)
    : base * (Number(product.discount.value || 0) / 100);
  return Number(Math.max(base - Math.min(amount, base), 0).toFixed(2));
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
