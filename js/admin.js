const COLLECTIONS_STORAGE_KEY = 'matria-collections-v4';
const PRODUCTS_STORAGE_KEY = 'matria-products-v4';
const COUPONS_STORAGE_KEY = 'matria-coupons-v4';
const CLIENT_PHOTOS_STORAGE_KEY = 'matria-client-photos-v1';
const CLIENT_COMMENTS_STORAGE_KEY = 'matria-client-comments-v1';
const STORE_SYNC_KEY = 'matria-sync-revision-v1';
const API_BASE = window.MATRIA_API_BASE || document.querySelector('meta[name="matria-api-base"]')?.content || '/api';
const ADMIN_TOKEN = window.MATRIA_ADMIN_TOKEN || localStorage.getItem('matria-admin-token') || '';

const adminState = {
  collections: [],
  products: [],
  coupons: [],
  clientPhotos: [],
  clientComments: [],
  editingCollectionId: null,
  editingProductId: null,
  editingCouponId: null,
  editingClientPhotoId: null,
  editingClientCommentId: null,
  defaults: { collections: [], products: [], coupons: [], clientPhotos: [], clientComments: [] },
  dataSource: 'static',
  revision: null
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
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    if (window.innerWidth <= 820) {
      primaryNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  }));
}

async function loadAdminData() {
  setSyncStatus('loading', 'Conectando con la API de sincronización…');
  const remotePayload = await fetchRemoteStore();
  if (remotePayload) {
    adminState.dataSource = 'd1';
    adminState.revision = remotePayload.revision || null;
    adminState.collections = normalizeCollections(remotePayload.collections || []);
    adminState.products = normalizeProducts(remotePayload.products || []);
    adminState.coupons = normalizeCoupons(remotePayload.coupons || []);
    adminState.clientPhotos = normalizeClientPhotos(remotePayload.clientPhotos || []);
    adminState.clientComments = normalizeClientComments(remotePayload.clientComments || []);
    adminState.defaults.collections = [...adminState.collections];
    adminState.defaults.products = [...adminState.products];
    adminState.defaults.coupons = [...adminState.coupons];
    adminState.defaults.clientPhotos = [...adminState.clientPhotos];
    adminState.defaults.clientComments = [...adminState.clientComments];
    cacheAdminData();
    setSyncStatus('success', 'Sincronizado con Cloudflare D1. Los cambios se publican automáticamente.');
    return;
  }

  const [collectionsDefault, productsDefault, couponsDefault, clientPhotosDefault, clientCommentsDefault] = await Promise.all([
    fetchJson('assets/data/collections.json', []),
    fetchJson('assets/data/products.json', []),
    fetchJson('assets/data/coupons.json', []),
    fetchJson('assets/data/client-photos.json', []),
    fetchJson('assets/data/client-comments.json', [])
  ]);
  adminState.defaults.collections = normalizeCollections(collectionsDefault);
  adminState.defaults.products = normalizeProducts(productsDefault);
  adminState.defaults.coupons = normalizeCoupons(couponsDefault);
  adminState.defaults.clientPhotos = normalizeClientPhotos(clientPhotosDefault);
  adminState.defaults.clientComments = normalizeClientComments(clientCommentsDefault);
  adminState.collections = normalizeCollections(readStorage(COLLECTIONS_STORAGE_KEY, null) || collectionsDefault);
  adminState.products = normalizeProducts(readStorage(PRODUCTS_STORAGE_KEY, null) || productsDefault);
  adminState.coupons = normalizeCoupons(readStorage(COUPONS_STORAGE_KEY, null) || couponsDefault);
  adminState.clientPhotos = normalizeClientPhotos(readStorage(CLIENT_PHOTOS_STORAGE_KEY, null) || clientPhotosDefault);
  adminState.clientComments = normalizeClientComments(readStorage(CLIENT_COMMENTS_STORAGE_KEY, null) || clientCommentsDefault);
  setSyncStatus('error', 'No se pudo conectar con la API. Se cargó la copia local de respaldo.');
}

async function fetchRemoteStore() {
  const payload = await fetchJson(`${API_BASE.replace(/\/$/, '')}/store`, null);
  if (!payload || !Array.isArray(payload.collections) || !Array.isArray(payload.products) || !Array.isArray(payload.coupons)) return null;
  return payload;
}

function cacheAdminData() {
  writeStorage(COLLECTIONS_STORAGE_KEY, adminState.collections);
  writeStorage(PRODUCTS_STORAGE_KEY, adminState.products);
  writeStorage(COUPONS_STORAGE_KEY, adminState.coupons);
  writeStorage(CLIENT_PHOTOS_STORAGE_KEY, adminState.clientPhotos);
  writeStorage(CLIENT_COMMENTS_STORAGE_KEY, adminState.clientComments);
}

function setSyncStatus(type, message) {
  const box = document.getElementById('syncStatusBox');
  if (!box) return;
  box.className = `system-note compact-note ${type}`;
  box.textContent = message;
}

function broadcastSync(resource, revision = null) {
  const nextRevision = revision || {
    resource,
    id: crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`,
    at: new Date().toISOString()
  };
  adminState.revision = nextRevision;
  writeStorage(STORE_SYNC_KEY, nextRevision);
}

async function saveRemoteSection(section, data) {
  const response = await fetch(`${API_BASE.replace(/\/$/, '')}/${section}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(ADMIN_TOKEN ? { 'X-Admin-Token': ADMIN_TOKEN } : {})
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(message || 'No se pudo guardar la información en Cloudflare D1.');
  }

  const payload = await response.json();
  broadcastSync(section, payload.revision || null);
  return payload;
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
  document.getElementById('addPresentationButton')?.addEventListener('click', () => addPresentationField(document.getElementById('presentationsList')));
  document.getElementById('discountEnabled')?.addEventListener('change', syncDiscountPanelState);

  document.getElementById('couponEditorForm')?.addEventListener('submit', handleCouponSubmit);
  document.getElementById('clientPhotoEditorForm')?.addEventListener('submit', handleClientPhotoSubmit);
  document.getElementById('clientCommentEditorForm')?.addEventListener('submit', handleClientCommentSubmit);
  document.getElementById('resetCouponButton')?.addEventListener('click', resetCouponForm);
  document.getElementById('deleteCouponButton')?.addEventListener('click', deleteEditingCoupon);
  document.getElementById('resetClientPhotoButton')?.addEventListener('click', resetClientPhotoForm);
  document.getElementById('deleteClientPhotoButton')?.addEventListener('click', deleteEditingClientPhoto);
  document.getElementById('resetClientCommentButton')?.addEventListener('click', resetClientCommentForm);
  document.getElementById('deleteClientCommentButton')?.addEventListener('click', deleteEditingClientComment);
  document.getElementById('clientPhotoFile')?.addEventListener('change', handleClientPhotoFileChange);

  document.getElementById('exportCollectionsButton')?.addEventListener('click', () => exportJson('collections.json', adminState.collections));
  document.getElementById('exportProductsButton')?.addEventListener('click', () => exportJson('products.json', adminState.products));
  document.getElementById('exportCouponsButton')?.addEventListener('click', () => exportJson('coupons.json', adminState.coupons));
  document.getElementById('exportClientPhotosButton')?.addEventListener('click', () => exportJson('client-photos.json', adminState.clientPhotos));
  document.getElementById('exportClientCommentsButton')?.addEventListener('click', () => exportJson('client-comments.json', adminState.clientComments));

  document.getElementById('importCollectionsInput')?.addEventListener('change', event => importJsonFile(event, 'collections'));
  document.getElementById('importProductsInput')?.addEventListener('change', event => importJsonFile(event, 'products'));
  document.getElementById('importCouponsInput')?.addEventListener('change', event => importJsonFile(event, 'coupons'));
  document.getElementById('importClientPhotosInput')?.addEventListener('change', event => importJsonFile(event, 'clientPhotos'));
  document.getElementById('importClientCommentsInput')?.addEventListener('change', event => importJsonFile(event, 'clientComments'));
  document.getElementById('resetAllDataButton')?.addEventListener('click', resetAllData);
}

function renderAllAdmin() {
  renderStats();
  renderCollectionsTable();
  renderProductsTable();
  renderCouponsTable();
  renderClientPhotosTable();
  renderClientCommentsTable();
  populateClientLinkSelects();
  populateCollectionSelect();
  syncDiscountPanelState();
}


function populateClientLinkSelects() {
  const photoSelect = document.getElementById('clientCommentLinkedPhotoId');
  const commentSelect = document.getElementById('clientPhotoLinkedCommentId');

  if (photoSelect) {
    const current = photoSelect.value;
    photoSelect.innerHTML = '<option value="">Sin vínculo</option>' + [...adminState.clientPhotos]
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.clientName || '').localeCompare(String(b.clientName || ''), 'es'))
      .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.clientName || 'Cliente MATRIA')} · ${escapeHtml(item.role || 'Foto')}</option>`).join('');
    photoSelect.value = current || '';
  }

  if (commentSelect) {
    const current = commentSelect.value;
    commentSelect.innerHTML = '<option value="">Sin vínculo</option>' + [...adminState.clientComments]
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.author || '').localeCompare(String(b.author || ''), 'es'))
      .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.author || 'Cliente MATRIA')} · ${escapeHtml(item.role || 'Comentario')}</option>`).join('');
    commentSelect.value = current || '';
  }
}

function renderStats() {
  const container = document.getElementById('adminStats');
  if (!container) return;
  const activeDiscounts = adminState.products.filter(product => getBestDiscount(product)?.enabled && Number(getBestDiscount(product).value) > 0).length;
  const activeCoupons = adminState.coupons.filter(coupon => coupon.active).length;
  const activeCollections = adminState.collections.filter(collection => collection.active).length;
  const visibleCollections = adminState.collections.filter(collection => collection.showOnHome && collection.active).length;
  const activeClientPhotos = adminState.clientPhotos.filter(item => item.active).length;

  container.innerHTML = `
    <article class="admin-stat-card"><span class="eyebrow">Colecciones</span><strong>${activeCollections}</strong><p>${visibleCollections} visibles en home.</p></article>
    <article class="admin-stat-card"><span class="eyebrow">Productos</span><strong>${adminState.products.length}</strong><p>Catálogo administrable.</p></article>
    <article class="admin-stat-card"><span class="eyebrow">Descuentos activos</span><strong>${activeDiscounts}</strong><p>Producto o presentación con descuento vigente.</p></article>
    <article class="admin-stat-card"><span class="eyebrow">Fotos de clientes</span><strong>${activeClientPhotos}</strong><p>Imágenes activas en el carrusel.</p></article>
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
        <td><div class="admin-actions-inline"><button class="btn btn-secondary btn-small" type="button" data-edit-collection="${escapeHtml(collection.id)}">Editar</button><button class="btn btn-danger btn-small" type="button" data-remove-collection="${escapeHtml(collection.id)}">Eliminar</button></div></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-edit-collection]').forEach(button => button.addEventListener('click', () => loadCollectionIntoForm(button.dataset.editCollection)));
  tbody.querySelectorAll('[data-remove-collection]').forEach(button => button.addEventListener('click', () => deleteCollection(button.dataset.removeCollection)));
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;
  if (!adminState.products.length) {
    tbody.innerHTML = '<tr><td colspan="8">No hay productos cargados.</td></tr>';
    return;
  }

  tbody.innerHTML = adminState.products.map(product => {
    const collection = getCollectionById(product.collectionId);
    const variants = getActiveVariants(product);
    return `
      <tr>
        <td><strong>${escapeHtml(product.name)}</strong><br /><span class="assistive">${escapeHtml(product.shortDescription || '')}</span></td>
        <td>${escapeHtml(collection?.name || '—')}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${formatCurrency(product.price)}</td>
        <td>${variants.length ? `${variants.length} presentación(es)` : 'Sin adicionales'}</td>
        <td>${escapeHtml(renderProductDiscountSummary(product))}</td>
        <td>${formatCurrency(currentLowestPrice(product))}</td>
        <td><div class="admin-actions-inline"><button class="btn btn-secondary btn-small" type="button" data-edit-product="${escapeHtml(product.id)}">Editar</button><button class="btn btn-danger btn-small" type="button" data-remove-product="${escapeHtml(product.id)}">Eliminar</button></div></td>
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
      <td><div class="admin-actions-inline"><button class="btn btn-secondary btn-small" type="button" data-edit-coupon="${escapeHtml(coupon.id)}">Editar</button><button class="btn btn-danger btn-small" type="button" data-remove-coupon="${escapeHtml(coupon.id)}">Eliminar</button></div></td>
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

async function handleCollectionSubmit(event) {
  event.preventDefault();
  const collection = collectCollectionFromForm();
  if (!collection) return;
  const existingIndex = adminState.collections.findIndex(item => item.id === collection.id);
  if (existingIndex >= 0) adminState.collections[existingIndex] = collection;
  else adminState.collections.push(collection);
  adminState.collections.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name, 'es'));
  try {
    await persistCollections();
    renderAllAdmin();
    resetCollectionForm();
    alert('Colección guardada correctamente.');
  } catch (error) {
    alert(error.message || 'No se pudo guardar la colección.');
  }
}

function collectCollectionFromForm() {
  const rawId = document.getElementById('collectionId').value.trim();
  const name = document.getElementById('collectionName').value.trim();
  if (!name) {
    alert('El nombre de la colección es obligatorio.');
    return null;
  }
  return normalizeCollections([{
    id: rawId || slugify(name),
    code: document.getElementById('collectionCode').value.trim(),
    name,
    title: name,
    tagline: document.getElementById('collectionTagline').value.trim(),
    story: document.getElementById('collectionStory').value.trim(),
    packName: document.getElementById('collectionPackName').value.trim(),
    packStory: document.getElementById('collectionPackStory').value.trim(),
    ctaLabel: document.getElementById('collectionCtaLabel').value.trim() || `Explorar ${name}`,
    sortOrder: Number(document.getElementById('collectionOrder').value || 0),
    active: document.getElementById('collectionStatus').value === 'true',
    featured: document.getElementById('collectionFeatured').checked,
    showOnHome: document.getElementById('collectionShowOnHome').checked,
    media: collectMediaFromList(document.getElementById('collectionMediaList'))
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
  document.getElementById('collectionOrder').value = Number(collection.sortOrder || 0);
  document.getElementById('collectionStatus').value = collection.active ? 'true' : 'false';
  document.getElementById('collectionFeatured').checked = Boolean(collection.featured);
  document.getElementById('collectionShowOnHome').checked = collection.showOnHome !== false;
  const mediaList = document.getElementById('collectionMediaList');
  mediaList.innerHTML = '';
  (collection.media.length ? collection.media : [{ type: 'image', src: '', alt: '', title: '', caption: '' }]).forEach(media => addMediaField(mediaList, media));
  document.getElementById('deleteCollectionButton').disabled = false;
  window.scrollTo({ top: document.getElementById('colecciones-admin').offsetTop - 90, behavior: 'smooth' });
}

function resetCollectionForm() {
  adminState.editingCollectionId = null;
  document.getElementById('collectionEditorForm')?.reset();
  document.getElementById('collectionId').value = '';
  document.getElementById('collectionFormTitle').textContent = 'Crear colección';
  document.getElementById('collectionShowOnHome').checked = true;
  document.getElementById('deleteCollectionButton').disabled = true;
  const list = document.getElementById('collectionMediaList');
  list.innerHTML = '';
  addMediaField(list, { type: 'image', src: '', alt: '', title: '', caption: '' });
}

async function deleteEditingCollection() {
  if (!adminState.editingCollectionId) return;
  await deleteCollection(adminState.editingCollectionId);
}

async function deleteCollection(collectionId) {
  const collection = adminState.collections.find(item => item.id === collectionId);
  if (!collection) return;
  const linkedProducts = adminState.products.filter(product => product.collectionId === collectionId);
  if (linkedProducts.length) {
    alert(`No puedes eliminar la colección "${collection.name}" porque tiene ${linkedProducts.length} producto(s) enlazado(s).`);
    return;
  }
  if (!confirm(`¿Eliminar la colección "${collection.name}"?`)) return;
  adminState.collections = adminState.collections.filter(item => item.id !== collectionId);
  try {
    await persistCollections();
    renderAllAdmin();
    if (adminState.editingCollectionId === collectionId) resetCollectionForm();
  } catch (error) {
    alert(error.message || 'No se pudo eliminar la colección.');
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  const product = collectProductFromForm();
  if (!product) return;
  const existingIndex = adminState.products.findIndex(item => item.id === product.id);
  if (existingIndex >= 0) adminState.products[existingIndex] = product;
  else adminState.products.unshift(product);
  try {
    await persistProducts();
    renderAllAdmin();
    resetProductForm();
    alert('Producto guardado correctamente.');
  } catch (error) {
    alert(error.message || 'No se pudo guardar el producto.');
  }
}

function collectProductFromForm() {
  const rawId = document.getElementById('productId').value.trim();
  const collectionId = document.getElementById('productCollection').value;
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value;
  const format = document.getElementById('productFormat').value;
  const price = Number(document.getElementById('productPrice').value || 0);
  const badge = document.getElementById('productBadge').value.trim();
  const presentationSize = document.getElementById('productPresentationSize').value.trim();
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

  return normalizeProducts([{
    id: rawId || slugify(name),
    collectionId,
    name,
    category,
    format,
    price,
    badge,
    presentationSize,
    technicalBlend,
    salesSpeech,
    shortDescription,
    description,
    descriptions: collectTextList(document.getElementById('descriptionsList'), '.description-input'),
    features: collectTextList(document.getElementById('featuresList'), '.feature-input'),
    media: collectMediaFromList(document.getElementById('mediaList')),
    variants: collectPresentationsFromList(document.getElementById('presentationsList')),
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
  document.getElementById('productPresentationSize').value = product.presentationSize || '';
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
  const presentationsList = document.getElementById('presentationsList');
  descriptionsList.innerHTML = '';
  featuresList.innerHTML = '';
  mediaList.innerHTML = '';
  presentationsList.innerHTML = '';
  (product.descriptions.length ? product.descriptions : ['']).forEach(text => addTextField(descriptionsList, 'description-input', 'Bloque descriptivo del producto', text));
  (product.features.length ? product.features : ['']).forEach(text => addTextField(featuresList, 'feature-input', 'Característica del producto', text));
  (product.media.length ? product.media : [{ type: 'image', src: '', alt: '', title: '', caption: '' }]).forEach(media => addMediaField(mediaList, media));
  (product.variants.length ? product.variants : []).forEach(variant => addPresentationField(presentationsList, variant));
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
  ['descriptionsList', 'featuresList', 'mediaList', 'presentationsList'].forEach(id => {
    const node = document.getElementById(id);
    if (node) node.innerHTML = '';
  });
  addTextField(document.getElementById('descriptionsList'), 'description-input', 'Bloque descriptivo del producto');
  addTextField(document.getElementById('featuresList'), 'feature-input', 'Característica del producto');
  addMediaField(document.getElementById('mediaList'), { type: 'image', src: '', alt: '', title: '', caption: '' });
  addPresentationField(document.getElementById('presentationsList'), { name: '', presentation: '', size: '', price: '', badge: '', isDefault: true, active: true, discount: { enabled: false, type: 'percent', value: 0 } });
  syncDiscountPanelState();
}

async function deleteEditingProduct() {
  if (!adminState.editingProductId) return;
  await deleteProduct(adminState.editingProductId);
}

async function deleteProduct(productId) {
  const product = adminState.products.find(item => item.id === productId);
  if (!product) return;
  if (!confirm(`¿Eliminar el producto "${product.name}"?`)) return;
  adminState.products = adminState.products.filter(item => item.id !== productId);
  try {
    await persistProducts();
    renderAllAdmin();
    if (adminState.editingProductId === productId) resetProductForm();
  } catch (error) {
    alert(error.message || 'No se pudo eliminar el producto.');
  }
}

async function handleCouponSubmit(event) {
  event.preventDefault();
  const coupon = collectCouponFromForm();
  if (!coupon) return;
  const existingIndex = adminState.coupons.findIndex(item => item.id === coupon.id);
  if (existingIndex >= 0) adminState.coupons[existingIndex] = coupon;
  else adminState.coupons.unshift(coupon);
  try {
    await persistCoupons();
    renderAllAdmin();
    resetCouponForm();
    alert('Cupón guardado correctamente.');
  } catch (error) {
    alert(error.message || 'No se pudo guardar el cupón.');
  }
}

function collectCouponFromForm() {
  const rawId = document.getElementById('couponId').value.trim();
  const code = document.getElementById('couponCode').value.trim().toUpperCase();
  const type = document.getElementById('couponType').value;
  const value = Number(document.getElementById('couponValue').value || 0);
  if (!code || !value) {
    alert('Completa el código y el valor del cupón.');
    return null;
  }
  return normalizeCoupons([{
    id: rawId || slugify(code),
    code,
    type,
    value,
    minOrder: Number(document.getElementById('couponMinOrder').value || 0),
    description: document.getElementById('couponDescription').value.trim(),
    active: document.getElementById('couponStatus').value === 'true'
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
  document.getElementById('couponStatus').value = coupon.active ? 'true' : 'false';
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

async function deleteEditingCoupon() {
  if (!adminState.editingCouponId) return;
  await deleteCoupon(adminState.editingCouponId);
}

async function deleteCoupon(couponId) {
  const coupon = adminState.coupons.find(item => item.id === couponId);
  if (!coupon) return;
  if (!confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;
  adminState.coupons = adminState.coupons.filter(item => item.id !== couponId);
  try {
    await persistCoupons();
    renderAllAdmin();
    if (adminState.editingCouponId === couponId) resetCouponForm();
  } catch (error) {
    alert(error.message || 'No se pudo eliminar el cupón.');
  }
}

function addTextField(list, inputClass, placeholder, value = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item';
  wrapper.innerHTML = `<div class="dynamic-item-row"><input class="${inputClass}" type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" /><button class="btn btn-danger btn-small" type="button">Quitar</button></div>`;
  wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
  list.appendChild(wrapper);
}

function addMediaField(list, media = { type: 'image', src: '', alt: '', title: '', caption: '' }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item media-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-grid media-grid-extended">
      <div class="field"><label>Tipo</label><select class="media-type"><option value="image" ${media.type === 'image' ? 'selected' : ''}>Imagen</option><option value="video" ${media.type === 'video' ? 'selected' : ''}>Video</option></select></div>
      <div class="field field-span-2"><label>Ruta relativa</label><input class="media-src" type="text" placeholder="assets/img/products/amanecer-interno/01.webp" value="${escapeHtml(media.src || '')}" /></div>
      <div class="field"><label>Alt</label><input class="media-alt" type="text" placeholder="Descripción breve accesible" value="${escapeHtml(media.alt || '')}" /></div>
      <div class="field"><label>Title</label><input class="media-title" type="text" placeholder="Título interno o tooltip" value="${escapeHtml(media.title || '')}" /></div>
      <div class="field field-span-2"><label>Caption</label><input class="media-caption" type="text" placeholder="Pie de imagen opcional" value="${escapeHtml(media.caption || '')}" /></div>
      <button class="btn btn-danger btn-small align-self-end" type="button">Quitar</button>
    </div>
  `;
  wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
  list.appendChild(wrapper);
}

function addPresentationField(list, variant = { name: '', presentation: '', size: '', price: '', badge: '', isDefault: false, active: true, discount: { enabled: false, type: 'percent', value: 0 } }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item variant-item';
  wrapper.innerHTML = `
    <div class="dynamic-item-grid variant-grid">
      <div class="field"><label>Nombre</label><input class="variant-name" type="text" placeholder="Ej. Vela 220 g" value="${escapeHtml(variant.name || '')}" /></div>
      <div class="field"><label>Presentación</label><input class="variant-presentation" type="text" placeholder="Ej. Frasco ámbar" value="${escapeHtml(variant.presentation || '')}" /></div>
      <div class="field"><label>Tamaño</label><input class="variant-size" type="text" placeholder="Ej. 220 g" value="${escapeHtml(variant.size || '')}" /></div>
      <div class="field"><label>Precio</label><input class="variant-price" type="number" min="0" step="0.01" placeholder="79.90" value="${escapeHtml(String(variant.price ?? ''))}" /></div>
      <div class="field"><label>Badge</label><input class="variant-badge" type="text" placeholder="Ej. Más elegido" value="${escapeHtml(variant.badge || '')}" /></div>
      <div class="field"><label>Descuento individual</label><select class="variant-discount-enabled"><option value="false" ${variant.discount?.enabled ? '' : 'selected'}>Usar descuento general</option><option value="true" ${variant.discount?.enabled ? 'selected' : ''}>Aplicar descuento propio</option></select></div>
      <div class="field"><label>Tipo descuento</label><select class="variant-discount-type"><option value="percent" ${variant.discount?.type === 'fixed' ? '' : 'selected'}>Porcentaje</option><option value="fixed" ${variant.discount?.type === 'fixed' ? 'selected' : ''}>Valor fijo</option></select></div>
      <div class="field"><label>Valor descuento</label><input class="variant-discount-value" type="number" min="0" step="0.01" placeholder="10 o 15.00" value="${escapeHtml(String(variant.discount?.value ?? 0))}" /></div>
      <label class="toggle-row compact-toggle"><input class="variant-default" type="checkbox" ${variant.isDefault ? 'checked' : ''} /> Presentación predeterminada</label>
      <label class="toggle-row compact-toggle"><input class="variant-active" type="checkbox" ${variant.active !== false ? 'checked' : ''} /> Activa</label>
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

function collectPresentationsFromList(list) {
  if (!list) return [];
  return [...list.querySelectorAll('.variant-item')].map((item, index) => {
    const name = item.querySelector('.variant-name').value.trim();
    const presentation = item.querySelector('.variant-presentation').value.trim();
    const size = item.querySelector('.variant-size').value.trim();
    const price = Number(item.querySelector('.variant-price').value || 0);
    const badge = item.querySelector('.variant-badge').value.trim();
    const discountEnabled = item.querySelector('.variant-discount-enabled').value === 'true';
    const discountType = item.querySelector('.variant-discount-type').value;
    const discountValue = Number(item.querySelector('.variant-discount-value').value || 0);
    const isDefault = item.querySelector('.variant-default').checked;
    const active = item.querySelector('.variant-active').checked;
    if (!name || !price) return null;
    return {
      id: slugify(`${name}-${presentation || index + 1}`),
      name,
      presentation,
      size,
      price,
      badge,
      isDefault,
      active,
      discount: {
        enabled: discountEnabled && discountValue > 0,
        type: discountType,
        value: discountValue
      }
    };
  }).filter(Boolean);
}

function syncDiscountPanelState() {
  const enabled = document.getElementById('discountEnabled')?.checked;
  const panel = document.getElementById('discountPanel');
  if (!panel) return;
  panel.classList.toggle('is-disabled', !enabled);
}



function renderClientCommentsTable() {
  const body = document.getElementById('clientCommentsTableBody');
  if (!body) return;

  const rows = [...adminState.clientComments].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.author || '').localeCompare(String(b.author || ''), 'es'));

  body.innerHTML = rows.length ? rows.map(item => `
    <tr>
      <td>${escapeHtml(item.author || 'Cliente MATRIA')}</td>
      <td>${escapeHtml(item.role || '')}</td>
      <td>${escapeHtml((item.quote || '').slice(0, 90))}</td>
      <td>${Number(item.rating || 5)}</td>
      <td>${item.active !== false ? '<span class="table-pill success">Activo</span>' : '<span class="table-pill muted">Oculto</span>'}</td>
      <td>${escapeHtml(resolveLinkedPhotoName(item.linkedPhotoId) || '—')}</td><td><button class="btn btn-ghost btn-small" type="button" data-edit-client-comment="${escapeHtml(item.id)}">Editar</button></td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="table-empty">Aún no agregaste comentarios.</td></tr>';

  body.querySelectorAll('[data-edit-client-comment]').forEach(button => {
    button.addEventListener('click', () => loadClientCommentIntoForm(button.dataset.editClientComment));
  });
}


function resolveLinkedCommentAuthor(commentId) {
  if (!commentId) return '';
  return adminState.clientComments.find(item => item.id === commentId)?.author || '';
}

function resolveLinkedPhotoName(photoId) {
  if (!photoId) return '';
  return adminState.clientPhotos.find(item => item.id === photoId)?.clientName || '';
}

async function handleClientPhotoSubmit(event) {
  event.preventDefault();
  const payload = createClientPhotoPayloadFromForm();
  const existingIndex = adminState.clientPhotos.findIndex(item => item.id === payload.id);
  if (existingIndex >= 0) adminState.clientPhotos.splice(existingIndex, 1, payload);
  else adminState.clientPhotos.push(payload);

  try {
    await persistClientPhotos();
    renderAllAdmin();
    loadClientPhotoIntoForm(payload.id);
    alert('Foto de cliente guardada correctamente.');
  } catch (error) {
    alert(error.message || 'No se pudo guardar la foto del cliente.');
  }
}

function createClientPhotoPayloadFromForm() {
  const name = document.getElementById('clientPhotoName').value.trim() || 'Cliente MATRIA';
  return normalizeClientPhotos([{
    id: document.getElementById('clientPhotoId').value.trim() || slugify(`${name}-${Date.now()}`),
    clientName: name,
    role: document.getElementById('clientPhotoRole').value.trim(),
    quote: document.getElementById('clientPhotoQuote').value.trim(),
    caption: document.getElementById('clientPhotoCaption').value.trim(),
    src: document.getElementById('clientPhotoSrc').value.trim(),
    alt: document.getElementById('clientPhotoAlt').value.trim() || name,
    sortOrder: Number(document.getElementById('clientPhotoOrder').value || 0),
    linkedCommentId: document.getElementById('clientPhotoLinkedCommentId').value.trim(),
    active: document.getElementById('clientPhotoActive').checked
  }])[0];
}

function loadClientPhotoIntoForm(photoId) {
  const item = adminState.clientPhotos.find(entry => entry.id === photoId);
  if (!item) return;
  adminState.editingClientPhotoId = item.id;
  document.getElementById('clientPhotoId').value = item.id;
  document.getElementById('clientPhotoName').value = item.clientName || '';
  document.getElementById('clientPhotoRole').value = item.role || '';
  document.getElementById('clientPhotoQuote').value = item.quote || '';
  document.getElementById('clientPhotoCaption').value = item.caption || '';
  document.getElementById('clientPhotoSrc').value = item.src || '';
  document.getElementById('clientPhotoAlt').value = item.alt || '';
  document.getElementById('clientPhotoOrder').value = Number(item.sortOrder || 0);
  document.getElementById('clientPhotoLinkedCommentId').value = item.linkedCommentId || '';
  document.getElementById('clientPhotoActive').checked = item.active !== false;
  document.getElementById('clientPhotoFile').value = '';
  document.getElementById('clientPhotoFormTitle').textContent = 'Editar foto del carrusel';
  document.getElementById('deleteClientPhotoButton').disabled = false;
  document.getElementById('clientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetClientPhotoForm() {
  adminState.editingClientPhotoId = null;
  document.getElementById('clientPhotoEditorForm')?.reset();
  document.getElementById('clientPhotoId').value = '';
  document.getElementById('clientPhotoOrder').value = '0';
  document.getElementById('clientPhotoLinkedCommentId').value = '';
  populateClientLinkSelects();
  document.getElementById('clientPhotoActive').checked = true;
  document.getElementById('clientPhotoFormTitle').textContent = 'Agregar foto al carrusel';
  document.getElementById('deleteClientPhotoButton').disabled = true;
}

async function deleteEditingClientPhoto() {
  if (!adminState.editingClientPhotoId) return;
  await deleteClientPhoto(adminState.editingClientPhotoId);
}

async function deleteClientPhoto(photoId) {
  if (!photoId) return;
  if (!confirm('¿Deseas eliminar esta foto del carrusel?')) return;
  adminState.clientPhotos = adminState.clientPhotos.filter(item => item.id !== photoId);
  try {
    await persistClientPhotos();
    if (adminState.editingClientPhotoId === photoId) resetClientPhotoForm();
    renderAllAdmin();
  } catch (error) {
    alert(error.message || 'No se pudo eliminar la foto del cliente.');
  }
}

function handleClientPhotoFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : '';
    if (result) {
      document.getElementById('clientPhotoSrc').value = result;
      if (!document.getElementById('clientPhotoAlt').value.trim()) {
        document.getElementById('clientPhotoAlt').value = document.getElementById('clientPhotoName').value.trim() || file.name;
      }
    }
  };
  reader.readAsDataURL(file);
}



async function handleClientCommentSubmit(event) {
  event.preventDefault();
  const payload = createClientCommentPayloadFromForm();
  const existingIndex = adminState.clientComments.findIndex(item => item.id === payload.id);
  if (existingIndex >= 0) adminState.clientComments.splice(existingIndex, 1, payload);
  else adminState.clientComments.push(payload);

  try {
    await persistClientComments();
    renderAllAdmin();
    loadClientCommentIntoForm(payload.id);
    alert('Comentario de cliente guardado correctamente.');
  } catch (error) {
    alert(error.message || 'No se pudo guardar el comentario del cliente.');
  }
}

function createClientCommentPayloadFromForm() {
  const author = document.getElementById('clientCommentAuthor').value.trim() || 'Cliente MATRIA';
  return normalizeClientComments([{
    id: document.getElementById('clientCommentId').value.trim() || slugify(`${author}-${Date.now()}`),
    author,
    role: document.getElementById('clientCommentRole').value.trim(),
    quote: document.getElementById('clientCommentQuote').value.trim(),
    rating: Number(document.getElementById('clientCommentRating').value || 5),
    sortOrder: Number(document.getElementById('clientCommentOrder').value || 0),
    linkedPhotoId: document.getElementById('clientCommentLinkedPhotoId').value.trim(),
    active: document.getElementById('clientCommentActive').checked
  }])[0];
}

function loadClientCommentIntoForm(commentId) {
  const item = adminState.clientComments.find(entry => entry.id === commentId);
  if (!item) return;
  adminState.editingClientCommentId = item.id;
  document.getElementById('clientCommentId').value = item.id;
  document.getElementById('clientCommentAuthor').value = item.author || '';
  document.getElementById('clientCommentRole').value = item.role || '';
  document.getElementById('clientCommentQuote').value = item.quote || '';
  document.getElementById('clientCommentRating').value = Number(item.rating || 5);
  document.getElementById('clientCommentOrder').value = Number(item.sortOrder || 0);
  document.getElementById('clientCommentLinkedPhotoId').value = item.linkedPhotoId || '';
  document.getElementById('clientCommentActive').checked = item.active !== false;
  document.getElementById('clientCommentFormTitle').textContent = 'Editar comentario del cliente';
  document.getElementById('deleteClientCommentButton').disabled = false;
  document.getElementById('comentarios-clientes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetClientCommentForm() {
  adminState.editingClientCommentId = null;
  document.getElementById('clientCommentEditorForm')?.reset();
  document.getElementById('clientCommentId').value = '';
  document.getElementById('clientCommentRating').value = '5';
  document.getElementById('clientCommentOrder').value = '0';
  document.getElementById('clientCommentLinkedPhotoId').value = '';
  populateClientLinkSelects();
  document.getElementById('clientCommentActive').checked = true;
  document.getElementById('clientCommentFormTitle').textContent = 'Agregar comentario de cliente';
  document.getElementById('deleteClientCommentButton').disabled = true;
}

async function deleteEditingClientComment() {
  if (!adminState.editingClientCommentId) return;
  await deleteClientComment(adminState.editingClientCommentId);
}

async function deleteClientComment(commentId) {
  if (!commentId) return;
  if (!confirm('¿Deseas eliminar este comentario?')) return;
  adminState.clientComments = adminState.clientComments.filter(item => item.id !== commentId);
  try {
    await persistClientComments();
    if (adminState.editingClientCommentId === commentId) resetClientCommentForm();
    renderAllAdmin();
  } catch (error) {
    alert(error.message || 'No se pudo eliminar el comentario.');
  }
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

async function importJsonFile(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (type === 'collections') {
        adminState.collections = normalizeCollections(data);
        await persistCollections();
        resetCollectionForm();
      } else if (type === 'products') {
        adminState.products = normalizeProducts(data);
        await persistProducts();
        resetProductForm();
      } else if (type === 'coupons') {
        adminState.coupons = normalizeCoupons(data);
        await persistCoupons();
        resetCouponForm();
      } else if (type === 'clientPhotos') {
        adminState.clientPhotos = normalizeClientPhotos(data);
        await persistClientPhotos();
        resetClientPhotoForm();
      } else {
        adminState.clientComments = normalizeClientComments(data);
        await persistClientComments();
        resetClientCommentForm();
      }
      renderAllAdmin();
      alert('Archivo importado correctamente.');
      event.target.value = '';
    } catch (error) {
      alert(error?.message || 'El archivo JSON no tiene un formato válido.');
    }
  };
  reader.readAsText(file);
}

async function resetAllData() {
  if (!confirm('Se restaurarán los datos base del proyecto y se reemplazarán los datos publicados en D1. ¿Deseas continuar?')) return;
  localStorage.removeItem(COLLECTIONS_STORAGE_KEY);
  localStorage.removeItem(PRODUCTS_STORAGE_KEY);
  localStorage.removeItem(COUPONS_STORAGE_KEY);
  localStorage.removeItem(CLIENT_PHOTOS_STORAGE_KEY);
  localStorage.removeItem(CLIENT_COMMENTS_STORAGE_KEY);
  adminState.collections = [...adminState.defaults.collections];
  adminState.products = [...adminState.defaults.products];
  adminState.coupons = [...adminState.defaults.coupons];
  adminState.clientPhotos = [...adminState.defaults.clientPhotos];
  adminState.clientComments = [...adminState.defaults.clientComments];
  try {
    await persistCollections();
    await persistProducts();
    await persistCoupons();
    await persistClientPhotos();
    await persistClientComments();
    resetCollectionForm();
    resetProductForm();
    resetCouponForm();
    resetClientPhotoForm();
    resetClientCommentForm();
    renderAllAdmin();
  } catch (error) {
    alert(error.message || 'No se pudo restaurar la data base.');
  }
}

async function persistCollections() {
  writeStorage(COLLECTIONS_STORAGE_KEY, adminState.collections);
  return saveRemoteSection('collections', adminState.collections);
}

async function persistProducts() {
  writeStorage(PRODUCTS_STORAGE_KEY, adminState.products);
  return saveRemoteSection('products', adminState.products);
}

async function persistCoupons() {
  writeStorage(COUPONS_STORAGE_KEY, adminState.coupons);
  return saveRemoteSection('coupons', adminState.coupons);
}

async function persistClientPhotos() {
  writeStorage(CLIENT_PHOTOS_STORAGE_KEY, adminState.clientPhotos);
  writeStorage(CLIENT_COMMENTS_STORAGE_KEY, adminState.clientComments);
  return saveRemoteSection('client-photos', adminState.clientPhotos);
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
    presentationSize: product.presentationSize || '',
    technicalBlend: product.technicalBlend || '',
    salesSpeech: product.salesSpeech || '',
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    descriptions: Array.isArray(product.descriptions) ? product.descriptions.filter(Boolean) : [],
    features: Array.isArray(product.features) ? product.features.filter(Boolean) : [],
    media: normalizeMedia(product.media),
    variants: normalizeVariants(product.variants),
    discount: {
      enabled: Boolean(product.discount?.enabled),
      type: product.discount?.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(product.discount?.value || 0)
    },
    active: product.active !== false,
    sortOrder: Number(product.sortOrder || 0)
  }));
}

function normalizeVariants(list) {
  return (Array.isArray(list) ? list : []).map((variant, index) => ({
    id: variant?.id || slugify(`${variant?.name || 'presentacion'}-${index + 1}`),
    name: variant?.name || 'Presentación',
    presentation: variant?.presentation || '',
    size: variant?.size || '',
    price: Number(variant?.price || 0),
    badge: variant?.badge || '',
    isDefault: Boolean(variant?.isDefault),
    active: variant?.active !== false,
    discount: {
      enabled: Boolean(variant?.discount?.enabled),
      type: variant?.discount?.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(variant?.discount?.value || 0)
    }
  })).filter(item => item.name);
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

function normalizeClientPhotos(list) {
  return (Array.isArray(list) ? list : []).map((item, index) => ({
    id: item?.id || slugify(`${item?.clientName || 'cliente'}-${index + 1}`),
    clientName: item?.clientName || 'Cliente MATRIA',
    role: item?.role || '',
    quote: item?.quote || '',
    caption: item?.caption || '',
    src: item?.src || '',
    alt: item?.alt || item?.clientName || 'Foto de cliente MATRIA',
    sortOrder: Number(item?.sortOrder || 0),
    linkedCommentId: item?.linkedCommentId || '',
    active: item?.active !== false
  })).filter(item => item.src);
}

function getCollectionById(collectionId) {
  return adminState.collections.find(collection => collection.id === collectionId) || null;
}

function getActiveVariants(product) {
  return Array.isArray(product?.variants) ? product.variants.filter(variant => variant.active !== false) : [];
}

function getEffectiveDiscount(product, variant = null) {
  if (variant?.discount?.enabled && Number(variant.discount.value) > 0) return variant.discount;
  return product.discount;
}

function currentPrice(product, variant = null) {
  const base = Number(variant?.price ?? product.price ?? 0);
  const discount = getEffectiveDiscount(product, variant);
  if (!discount?.enabled || Number(discount.value) <= 0) return Number(base.toFixed(2));
  const amount = discount.type === 'fixed' ? Number(discount.value || 0) : base * (Number(discount.value || 0) / 100);
  return Number(Math.max(base - Math.min(amount, base), 0).toFixed(2));
}

function currentLowestPrice(product) {
  const variants = getActiveVariants(product);
  if (!variants.length) return currentPrice(product);
  return variants.reduce((lowest, variant) => Math.min(lowest, currentPrice(product, variant)), currentPrice(product, variants[0]));
}

function getBestDiscount(product) {
  const variants = getActiveVariants(product);
  const discounts = variants.map(variant => getEffectiveDiscount(product, variant)).filter(discount => discount?.enabled && Number(discount.value) > 0);
  if (discounts.length) return discounts.sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  return product.discount;
}

function renderProductDiscountSummary(product) {
  const best = getBestDiscount(product);
  if (!best?.enabled || Number(best.value) <= 0) return 'Sin descuento';
  return renderDiscountLabel(best);
}

function renderDiscountLabel(discount) {
  if (!discount || !discount.enabled || Number(discount.value) <= 0) return 'Sin descuento';
  return discount.type === 'fixed' ? `-${formatCurrency(discount.value)}` : `-${discount.value}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(Number(value) || 0);
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

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function safeReadError(response) {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || '';
  } catch {
    return '';
  }
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
  }, { threshold: 0.12 });
  items.forEach(item => {
    if (!item.classList.contains('in-view')) observer.observe(item);
  });
}


function normalizeClientComments(list) {
  return (Array.isArray(list) ? list : []).map((item, index) => ({
    id: item?.id || slugify((item?.author || item?.clientName || `comentario-${Date.now()}-${index + 1}`)),
    author: item?.author || item?.clientName || item?.name || 'Cliente MATRIA',
    role: item?.role || '',
    quote: item?.quote || item?.comment || '',
    rating: Number(item?.rating || 5),
    sortOrder: Number(item?.sortOrder || 0),
    linkedPhotoId: item?.linkedPhotoId || '',
    active: item?.active !== false
  })).filter(item => item.quote);
}
