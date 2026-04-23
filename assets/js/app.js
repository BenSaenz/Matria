const STORE_SYNC_KEY = 'matria-sync-revision-v1';
const API_BASE = window.MATRIA_API_BASE || document.querySelector('meta[name="matria-api-base"]')?.content || '/api';
const WHATSAPP_NUMBER = '51999999999';
const COLLECTIONS_STORAGE_KEY = 'matria-collections-v4';
const PRODUCTS_STORAGE_KEY = 'matria-products-v4';
const COUPONS_STORAGE_KEY = 'matria-coupons-v4';
const CART_STORAGE_KEY = 'matria-cart-v4';
const APPLIED_COUPON_STORAGE_KEY = 'matria-applied-coupon-v4';
const CLIENT_PHOTOS_STORAGE_KEY = 'matria-client-photos-v1';
const CLIENT_COMMENTS_STORAGE_KEY = 'matria-client-comments-v1';
const TESTIMONIAL_AUTOPLAY_DELAY = 6000;

let testimonialAutoplayTimer = null;
let testimonialAutoplayPaused = false;

const state = {
  collections: [],
  products: [],
  filteredProducts: [],
  coupons: [],
  clientPhotos: [],
  clientComments: readStorage(CLIENT_COMMENTS_STORAGE_KEY, []),
  cart: readStorage(CART_STORAGE_KEY, []),
  activeProduct: null,
  activeVariantId: null,
  activeMediaIndex: 0,
  appliedCoupon: readStorage(APPLIED_COUPON_STORAGE_KEY, null),
  catalogRevision: null,
  activeClientPhotoIndex: 0,
  activeTestimonialIndex: 0
};

document.addEventListener('DOMContentLoaded', initStorefront);

async function initStorefront() {
  if (document.body.dataset.page !== 'storefront') return;
  setYear();
  setupNav();
  bindForms();
  renderTestimonials();
  bindStorefrontEvents();
  setupTestimonialAutoplay();
  await loadCatalogData();
  renderClientPhotoCarousel();
  applyFilters();
  renderCollections();
  renderClientPhotoCarousel();
  renderCart();
  listenForStoreSync();
  initRevealOnScroll();
}

function setYear() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
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

function bindForms() {
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', event => {
    event.preventDefault();
    alert('Tu consulta fue preparada. En la siguiente fase, este formulario puede conectarse con correo, CRM o automatizaciones.');
    event.target.reset();
  });
}


function findLinkedCommentForPhoto(photo) {
  if (!photo) return null;
  const activeComments = state.clientComments.filter(item => item.active !== false && item.quote);
  return activeComments.find(item => item.id === photo.linkedCommentId || item.linkedPhotoId === photo.id) || null;
}

function getInitials(value) {
  return String(value || 'CM')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'CM';
}

function buildPremiumTestimonials() {
  const photos = [...(state.clientPhotos || [])]
    .filter(item => item.active !== false && item.src)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.clientName || '').localeCompare(String(b.clientName || ''), 'es'))
    .map(photo => {
      const linkedComment = findLinkedCommentForPhoto(photo);
      return {
        id: `photo-${photo.id}`,
        type: 'photo',
        author: photo.clientName || 'Cliente MATRIA',
        role: photo.role || linkedComment?.role || '',
        quote: photo.quote || photo.caption || linkedComment?.quote || 'Una experiencia real compartida por nuestra comunidad.',
        rating: Math.max(1, Math.min(5, Number(linkedComment?.rating || photo.rating || 5))),
        photo,
        comment: linkedComment || null,
        sortOrder: Number(photo.sortOrder || 0)
      };
    });

  const comments = [...(state.clientComments || [])]
    .filter(item => item.active !== false && item.quote)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.author || '').localeCompare(String(b.author || ''), 'es'))
    .map(comment => ({
      id: `comment-${comment.id}`,
      type: 'comment',
      author: comment.author || 'Cliente MATRIA',
      role: comment.role || '',
      quote: comment.quote || '',
      rating: Math.max(1, Math.min(5, Number(comment.rating || 5))),
      photo: null,
      comment,
      sortOrder: Number(comment.sortOrder || 0)
    }));

  return [...photos, ...comments];
}

function renderTestimonials() {
  const container = document.getElementById('testimonialsGrid');
  const block = document.getElementById('clientGalleryBlock');
  if (!container) return;
  if (block) block.hidden = true;

  const items = buildPremiumTestimonials();

  if (!items.length) {
    stopTestimonialAutoplay();
    container.innerHTML = '';
    return;
  }

  if (state.activeTestimonialIndex >= items.length) state.activeTestimonialIndex = 0;
  const active = items[state.activeTestimonialIndex] || items[0];
  const stars = '★'.repeat(Math.max(1, Math.min(5, Number(active.rating || 5))));
  const hasPhoto = Boolean(active.photo?.src);
  const imageSrc = active.photo?.src || '';
  const imageAlt = active.photo?.alt || active.author || 'Cliente MATRIA';
  const caption = active.photo?.caption || active.role || '';

  container.innerHTML = `
    <article class="testimonial-premium testimonial-fade-enter reveal in-view ${hasPhoto ? 'has-photo' : 'is-comment-only'}">
      <div class="testimonial-premium-main">
        <div class="testimonial-premium-visual ${hasPhoto ? '' : 'is-comment-panel'}">
          ${hasPhoto ? `
            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />
            <div class="testimonial-premium-badge">
              <span class="eyebrow">Comunidad MATRIA</span>
              <strong>${escapeHtml(active.author || 'Cliente MATRIA')}</strong>
            </div>
          ` : `
            <div class="testimonial-premium-monogram" aria-hidden="true">${escapeHtml(getInitials(active.author))}</div>
            <div class="testimonial-premium-badge testimonial-premium-badge-static">
              <span class="eyebrow">Comentario de cliente</span>
              <strong>${escapeHtml(active.author || 'Cliente MATRIA')}</strong>
            </div>
          `}
        </div>
        <div class="testimonial-premium-copy">
          <div class="testimonial-premium-top">
            <span class="stars" aria-hidden="true">${stars}</span>
            <div class="testimonial-premium-nav">
              <button class="icon-btn testimonial-nav-btn" type="button" data-testimonial-step="-1" aria-label="Comentario anterior">‹</button>
              <button class="icon-btn testimonial-nav-btn" type="button" data-testimonial-step="1" aria-label="Comentario siguiente">›</button>
            </div>
          </div>
          <p class="testimonial-premium-quote">“${escapeHtml(active.quote)}”</p>
          <div class="testimonial-premium-author">
            <strong>${escapeHtml(active.author || 'Cliente MATRIA')}</strong>
            ${active.role ? `<span>${escapeHtml(active.role)}</span>` : ''}
          </div>
          ${caption ? `<p class="testimonial-premium-caption">${escapeHtml(caption)}</p>` : ''}
        </div>
      </div>
      <div class="testimonial-miniatures" role="tablist" aria-label="Seleccionar testimonio">
        ${items.map((item, index) => {
          const itemHasPhoto = Boolean(item.photo?.src);
          const thumbSrc = item.photo?.src || '';
          const thumbAlt = item.photo?.alt || item.author || 'Cliente MATRIA';
          return `
            <button class="testimonial-miniature ${index === state.activeTestimonialIndex ? 'is-active' : ''}" type="button" data-testimonial-index="${index}" aria-label="Ver testimonio de ${escapeHtml(item.author || 'Cliente MATRIA')}">
              <span class="testimonial-miniature-thumb ${itemHasPhoto ? '' : 'is-comment-thumb'}">
                ${itemHasPhoto ? `<img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(thumbAlt)}" loading="lazy" />` : `<span class="testimonial-miniature-initials">${escapeHtml(getInitials(item.author))}</span>`}
              </span>
              <span class="testimonial-miniature-copy">
                <strong>${escapeHtml(item.author || 'Cliente MATRIA')}</strong>
                <span>${escapeHtml((item.role || '').slice(0, 48) || 'Experiencia real')}</span>
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </article>
  `;

  const shell = container.querySelector('.testimonial-premium');
  if (shell) {
    shell.addEventListener('mouseenter', () => { testimonialAutoplayPaused = true; });
    shell.addEventListener('mouseleave', () => { testimonialAutoplayPaused = false; });
    shell.addEventListener('focusin', () => { testimonialAutoplayPaused = true; });
    shell.addEventListener('focusout', () => { testimonialAutoplayPaused = false; });
  }

  container.querySelectorAll('[data-testimonial-index]').forEach(button => button.addEventListener('click', () => {
    testimonialAutoplayPaused = false;
    state.activeTestimonialIndex = Number(button.dataset.testimonialIndex || 0);
    renderTestimonials();
    restartTestimonialAutoplay();
  }));

  container.querySelectorAll('[data-testimonial-step]').forEach(button => button.addEventListener('click', () => {
    testimonialAutoplayPaused = false;
    stepTestimonial(Number(button.dataset.testimonialStep || 1));
    restartTestimonialAutoplay();
  }));

  requestAnimationFrame(() => {
    shell?.classList.add('is-visible');
  });
}

function renderClientPhotoCarousel() {
  const block = document.getElementById('clientGalleryBlock');
  const container = document.getElementById('clientPhotoCarousel');
  if (block) block.hidden = true;
  if (container) container.innerHTML = '';
}

function stepTestimonial(direction) {
  const total = buildPremiumTestimonials().length;
  if (!total) return;
  state.activeTestimonialIndex = (state.activeTestimonialIndex + direction + total) % total;
  renderTestimonials();
}

function setupTestimonialAutoplay() {
  document.addEventListener('visibilitychange', () => {
    testimonialAutoplayPaused = document.hidden;
  });
  restartTestimonialAutoplay();
}

function restartTestimonialAutoplay() {
  stopTestimonialAutoplay();
  const total = buildPremiumTestimonials().length;
  if (total < 2) return;
  testimonialAutoplayTimer = window.setInterval(() => {
    if (document.hidden || testimonialAutoplayPaused) return;
    stepTestimonial(1);
  }, TESTIMONIAL_AUTOPLAY_DELAY);
}

function stopTestimonialAutoplay() {
  if (testimonialAutoplayTimer) {
    window.clearInterval(testimonialAutoplayTimer);
    testimonialAutoplayTimer = null;
  }
}

function stepClientPhoto(direction) {
  stepTestimonial(direction);
}

async function loadCatalogData() {
  const payload = await getStorePayload();
  const currentFilters = snapshotFilters();

  state.catalogRevision = payload.revision || null;
  state.collections = normalizeCollections(payload.collections).filter(item => item.active !== false);
  state.products = normalizeProducts(payload.products).filter(item => item.active !== false);
  state.coupons = normalizeCoupons(payload.coupons).filter(item => item.active !== false);
  state.clientPhotos = normalizeClientPhotos(payload.clientPhotos || []).filter(item => item.active !== false);
  state.clientComments = normalizeClientComments(payload.clientComments || []).filter(item => item.active !== false);
  if (state.activeClientPhotoIndex >= state.clientPhotos.length) state.activeClientPhotoIndex = 0;
  renderTestimonials();

  if (state.appliedCoupon?.code) {
    state.appliedCoupon = state.coupons.find(coupon => coupon.code === state.appliedCoupon.code) || null;
    persistAppliedCoupon();
  }

  populateCollectionFilter(currentFilters.collectionId);
  populateCategoryFilter(currentFilters.category);
  restoreFilters(currentFilters);
}

async function getStorePayload() {
  const remotePayload = await fetchRemoteStore();
  if (remotePayload) {
    cacheRemoteStore(remotePayload);
    return remotePayload;
  }

  const [collectionsDefault, productsDefault, couponsDefault, clientPhotosDefault, clientCommentsDefault] = await Promise.all([
    fetchJson('assets/data/collections.json', []),
    fetchJson('assets/data/products.json', []),
    fetchJson('assets/data/coupons.json', []),
    fetchJson('assets/data/client-photos.json', []),
    fetchJson('assets/data/client-comments.json', [])
  ]);

  return {
    revision: readStorage(STORE_SYNC_KEY, null),
    collections: readStorage(COLLECTIONS_STORAGE_KEY, null) || collectionsDefault,
    products: readStorage(PRODUCTS_STORAGE_KEY, null) || productsDefault,
    coupons: readStorage(COUPONS_STORAGE_KEY, null) || couponsDefault,
    clientPhotos: readStorage(CLIENT_PHOTOS_STORAGE_KEY, null) || clientPhotosDefault,
    clientComments: readStorage(CLIENT_COMMENTS_STORAGE_KEY, null) || clientCommentsDefault
  };
}

async function fetchRemoteStore() {
  const payload = await fetchJson(`${API_BASE.replace(/\/$/, '')}/store`, null);
  if (!payload || !Array.isArray(payload.collections) || !Array.isArray(payload.products) || !Array.isArray(payload.coupons)) {
    return null;
  }
  return payload;
}

function cacheRemoteStore(payload) {
  writeStorage(COLLECTIONS_STORAGE_KEY, payload.collections || []);
  writeStorage(PRODUCTS_STORAGE_KEY, payload.products || []);
  writeStorage(COUPONS_STORAGE_KEY, payload.coupons || []);
  writeStorage(CLIENT_PHOTOS_STORAGE_KEY, payload.clientPhotos || []);
  writeStorage(CLIENT_COMMENTS_STORAGE_KEY, payload.clientComments || []);
  if (payload.revision) writeStorage(STORE_SYNC_KEY, payload.revision);
}

function snapshotFilters() {
  return {
    query: document.getElementById('searchInput')?.value || '',
    collectionId: document.getElementById('collectionFilter')?.value || 'todos',
    category: document.getElementById('categoryFilter')?.value || 'todos',
    format: document.getElementById('formatFilter')?.value || 'todos',
    sort: document.getElementById('sortFilter')?.value || 'destacados'
  };
}

function restoreFilters(filters = {}) {
  const ids = ['searchInput', 'collectionFilter', 'categoryFilter', 'formatFilter', 'sortFilter'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'searchInput') el.value = filters.query || '';
    if (id === 'collectionFilter') el.value = optionExists(el, filters.collectionId) ? filters.collectionId : 'todos';
    if (id === 'categoryFilter') el.value = optionExists(el, filters.category) ? filters.category : 'todos';
    if (id === 'formatFilter') el.value = optionExists(el, filters.format) ? filters.format : 'todos';
    if (id === 'sortFilter') el.value = optionExists(el, filters.sort) ? filters.sort : 'destacados';
  });
}

function optionExists(select, value) {
  return [...select.options].some(option => option.value === value);
}

async function refreshStorefrontData() {
  const filters = snapshotFilters();
  await loadCatalogData();
  restoreFilters(filters);
  applyFilters();
  renderCollections();
  renderClientPhotoCarousel();
  renderCart();
  if (state.activeProduct) {
    const updated = state.products.find(product => product.id === state.activeProduct.id);
    state.activeProduct = updated || null;
    state.activeVariantId = updated ? getDefaultVariant(updated, state.activeVariantId)?.id || null : null;
    if (updated) renderProductModal();
    else closeProduct();
  }
}

function listenForStoreSync() {
  window.addEventListener('storage', async event => {
    if (event.key !== STORE_SYNC_KEY || !event.newValue || event.newValue === event.oldValue) return;
    await refreshStorefrontData();
  });
}

function bindStorefrontEvents() {
  ['searchInput', 'collectionFilter', 'categoryFilter', 'sortFilter', 'formatFilter'].forEach(id => {
    const control = document.getElementById(id);
    control?.addEventListener('input', applyFilters);
    control?.addEventListener('change', applyFilters);
  });

  document.getElementById('cartButton')?.addEventListener('click', openCart);
  document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', openCart));
  document.querySelectorAll('[data-close-cart]').forEach(button => button.addEventListener('click', closeCart));
  document.querySelectorAll('[data-close-product]').forEach(button => button.addEventListener('click', closeProduct));
  document.getElementById('applyCouponButton')?.addEventListener('click', handleApplyCoupon);
  document.getElementById('checkoutWhatsApp')?.addEventListener('click', checkoutViaWhatsApp);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeCart();
      closeProduct();
    }
  });
}

function populateCollectionFilter(selectedValue = 'todos') {
  const select = document.getElementById('collectionFilter');
  if (!select) return;
  const options = ['<option value="todos">Todas</option>'];
  [...state.collections]
    .filter(collection => collection.active !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name, 'es'))
    .forEach(collection => options.push(`<option value="${escapeHtml(collection.id)}">${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}</option>`));
  select.innerHTML = options.join('');
  select.value = optionExists(select, selectedValue) ? selectedValue : 'todos';
}

function populateCategoryFilter(selectedValue = 'todos') {
  const select = document.getElementById('categoryFilter');
  if (!select) return;
  const categories = [...new Set(state.products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  select.innerHTML = ['<option value="todos">Todas</option>', ...categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)].join('');
  select.value = optionExists(select, selectedValue) ? selectedValue : 'todos';
}

function renderCollections() {
  const grid = document.getElementById('collectionsGrid');
  if (!grid) return;
  const items = state.collections.filter(item => item.active !== false && item.showOnHome !== false)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name, 'es'));

  grid.innerHTML = items.map(collection => {
    const productCount = state.products.filter(product => product.collectionId === collection.id).length;
    const media = collection.media?.[0];
    return `
      <article class="collection-card reveal">
        <div class="collection-media">${renderMedia(media, collection.name)}</div>
        <div class="collection-body">
          <div class="collection-top">
            <span class="eyebrow">${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}</span>
            <h3>${escapeHtml(collection.title || collection.name)}</h3>
            <p>${escapeHtml(collection.tagline || collection.story || '')}</p>
          </div>
          ${collection.packName ? `<div class="collection-meta"><span class="badge">${escapeHtml(collection.packName)}</span><span class="badge">${productCount} producto(s)</span></div>` : `<div class="collection-meta"><span class="badge">${productCount} producto(s)</span></div>`}
          ${collection.packStory ? `<p class="collection-story">${escapeHtml(collection.packStory)}</p>` : ''}
          <div class="hero-actions">
            <button class="btn btn-primary" type="button" data-collection-filter="${escapeHtml(collection.id)}">${escapeHtml(collection.ctaLabel || 'Explorar colección')}</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-collection-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const filter = document.getElementById('collectionFilter');
      if (filter) filter.value = button.dataset.collectionFilter;
      applyFilters();
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function applyFilters() {
  const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const collectionId = document.getElementById('collectionFilter')?.value || 'todos';
  const category = document.getElementById('categoryFilter')?.value || 'todos';
  const format = document.getElementById('formatFilter')?.value || 'todos';
  const sort = document.getElementById('sortFilter')?.value || 'destacados';

  let items = [...state.products].filter(product => {
    const haystack = [product.name, product.category, product.description, product.shortDescription, product.technicalBlend, product.salesSpeech].join(' ').toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesCollection = collectionId === 'todos' || product.collectionId === collectionId;
    const matchesCategory = category === 'todos' || product.category === category;
    const matchesFormat = format === 'todos' || product.format === format;
    return matchesQuery && matchesCollection && matchesCategory && matchesFormat;
  });

  if (sort === 'precio-asc') items.sort((a, b) => productStartingPrice(a) - productStartingPrice(b));
  if (sort === 'precio-desc') items.sort((a, b) => productStartingPrice(b) - productStartingPrice(a));
  if (sort === 'descuento') items.sort((a, b) => productMaxDiscountValue(b) - productMaxDiscountValue(a));
  if (sort === 'destacados') items.sort((a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)) || productMaxDiscountValue(b) - productMaxDiscountValue(a));

  state.filteredProducts = items;
  renderActiveCollectionChip(collectionId);
  renderProducts();
}

function renderActiveCollectionChip(collectionId) {
  const chip = document.getElementById('activeCollectionChip');
  if (!chip) return;
  if (!collectionId || collectionId === 'todos') {
    chip.hidden = true;
    chip.innerHTML = '';
    return;
  }
  const collection = getCollectionById(collectionId);
  if (!collection) {
    chip.hidden = true;
    chip.innerHTML = '';
    return;
  }
  chip.hidden = false;
  chip.innerHTML = `
    <span class="badge">Colección activa: ${escapeHtml(collection.name)}</span>
    <button class="btn btn-ghost btn-small" type="button" id="clearCollectionFilter">Quitar filtro</button>
  `;
  chip.querySelector('#clearCollectionFilter')?.addEventListener('click', () => {
    const filter = document.getElementById('collectionFilter');
    if (filter) filter.value = 'todos';
    applyFilters();
  });
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (!state.filteredProducts.length) {
    grid.innerHTML = '<div class="empty-state"><strong>No encontramos productos con esos filtros.</strong><p>Prueba otra búsqueda o restablece las categorías.</p></div>';
    return;
  }

  grid.innerHTML = state.filteredProducts.map(product => {
    const media = product.media?.[0];
    const collection = getCollectionById(product.collectionId);
    const startPrice = productStartingPrice(product);
    const basePrice = productStartingReferencePrice(product);
    const hasDiscount = startPrice < basePrice;
    const variants = getActiveVariants(product);
    return `
      <article class="product-card reveal">
        <div class="product-media">
          ${renderMedia(media, product.name)}
          <div class="product-badges">
            ${product.badge ? `<span class="badge">${escapeHtml(product.badge)}</span>` : ''}
            ${collection ? `<span class="badge">${escapeHtml(collection.name)}</span>` : ''}
            ${hasDiscount ? `<span class="badge">${escapeHtml(renderDiscountLabel(getBestDiscount(product)))}</span>` : ''}
          </div>
        </div>
        <div class="product-body">
          <div class="product-top">
            <span class="eyebrow">${escapeHtml(product.category)} · ${product.format === 'regalo' ? 'regalo' : 'ritual individual'}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.shortDescription || product.description || '')}</p>
          </div>
          <div class="product-meta product-meta-stack">
            ${collection ? `<span class="assistive"><strong>Colección:</strong> ${escapeHtml(collection.name)}</span>` : ''}
            ${product.presentationSize ? `<span class="assistive"><strong>Tamaño base:</strong> ${escapeHtml(product.presentationSize)}</span>` : ''}
            ${variants.length ? `<span class="assistive"><strong>Presentaciones:</strong> ${variants.length} opción(es)</span>` : ''}
            ${product.technicalBlend ? `<span class="assistive"><strong>Mezcla:</strong> ${escapeHtml(product.technicalBlend)}</span>` : ''}
            <div class="price-wrap">
              <span class="price-current">${variants.length ? 'Desde ' : ''}${formatCurrency(startPrice)}</span>
              ${hasDiscount ? `<span class="price-old">${formatCurrency(basePrice)}</span>` : ''}
            </div>
          </div>
          <div class="product-actions">
            <button class="btn btn-secondary" type="button" data-view-product="${escapeHtml(product.id)}">Ver detalle</button>
            <button class="btn btn-primary" type="button" data-add-product="${escapeHtml(product.id)}">Agregar</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-view-product]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.viewProduct)));
  grid.querySelectorAll('[data-add-product]').forEach(button => button.addEventListener('click', () => {
    const product = state.products.find(item => item.id === button.dataset.addProduct);
    if (!product) return;
    addToCart(product.id, getDefaultVariant(product)?.id || null);
  }));
  initRevealOnScroll();
}

function openProduct(productId) {
  const product = state.products.find(item => item.id === productId);
  if (!product) return;
  state.activeProduct = product;
  state.activeMediaIndex = 0;
  state.activeVariantId = getDefaultVariant(product)?.id || null;
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  if (modal) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }
  if (title) title.textContent = product.name;
  renderProductModal();
}

function closeProduct() {
  const modal = document.getElementById('productModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function renderProductModal() {
  const body = document.getElementById('productModalBody');
  const product = state.activeProduct;
  if (!body || !product) return;
  const collection = getCollectionById(product.collectionId);
  const selectedVariant = getDefaultVariant(product, state.activeVariantId);
  const displayPrice = currentPrice(product, selectedVariant);
  const referencePrice = Number(selectedVariant?.price ?? product.price ?? 0);
  const activeMedia = product.media?.[state.activeMediaIndex] || product.media?.[0];
  const variants = getActiveVariants(product);

  body.innerHTML = `
    <article class="product-detail">
      <div class="product-gallery">
        <div class="gallery-main">${renderMedia(activeMedia, product.name)}</div>
        <div class="gallery-thumbs">
          ${(product.media || []).map((item, index) => `
            <button class="thumb ${index === state.activeMediaIndex ? 'is-active' : ''}" type="button" data-thumb-index="${index}" aria-label="Ver imagen ${index + 1} de ${escapeHtml(product.name)}">
              ${renderMedia(item, product.name)}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="product-info">
        <span class="eyebrow">${escapeHtml(product.category)} · ${product.format === 'regalo' ? 'regalo' : 'ritual individual'}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <div class="price-wrap">
          <span class="price-current">${formatCurrency(displayPrice)}</span>
          ${displayPrice < referencePrice ? `<span class="price-old">${formatCurrency(referencePrice)}</span>` : ''}
          ${getEffectiveDiscount(product, selectedVariant)?.enabled ? `<span class="badge">${escapeHtml(renderDiscountLabel(getEffectiveDiscount(product, selectedVariant)))}</span>` : ''}
        </div>
        ${selectedVariant ? `<div class="notice"><strong>Presentación elegida:</strong> ${escapeHtml(selectedVariant.name)}${selectedVariant.presentation ? `<br />${escapeHtml(selectedVariant.presentation)}` : ''}${selectedVariant.size ? `<br /><strong>Tamaño:</strong> ${escapeHtml(selectedVariant.size)}` : ''}</div>` : (product.presentationSize ? `<div class="notice"><strong>Tamaño base:</strong> ${escapeHtml(product.presentationSize)}</div>` : '')}
        ${collection ? `<div class="notice"><strong>Colección:</strong> ${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}<br />${escapeHtml(collection.tagline || '')}</div>` : ''}
        ${product.technicalBlend ? `<div class="spec-line"><strong>Mezcla técnica:</strong> ${escapeHtml(product.technicalBlend)}</div>` : ''}
        ${product.salesSpeech ? `<div class="spec-line"><strong>Gancho de venta:</strong> ${escapeHtml(product.salesSpeech)}</div>` : ''}
        <p>${escapeHtml(product.description || '')}</p>
        ${Array.isArray(product.descriptions) && product.descriptions.length ? `<div class="description-stack">${product.descriptions.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div>` : ''}
        ${variants.length ? `
          <div class="variant-selector-block">
            <strong>Elige presentación</strong>
            <div class="variant-selector-grid">
              ${variants.map(variant => {
                const selected = state.activeVariantId === variant.id;
                const variantPrice = currentPrice(product, variant);
                const original = Number(variant.price || 0);
                return `
                  <button class="variant-pill ${selected ? 'is-active' : ''}" type="button" data-variant-id="${escapeHtml(variant.id)}">
                    <span class="variant-pill-name">${escapeHtml(variant.name)}</span>
                    ${variant.presentation || variant.size ? `<span class="variant-pill-meta">${escapeHtml([variant.presentation, variant.size].filter(Boolean).join(' · '))}</span>` : ''}
                    <span class="variant-pill-price">${formatCurrency(variantPrice)}${variantPrice < original ? ` <small>${formatCurrency(original)}</small>` : ''}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        <div>
          <strong>Incluye</strong>
          <ul>${(product.features || []).map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>
        </div>
        <div class="product-actions">
          <button class="btn btn-primary" type="button" data-add-product="${escapeHtml(product.id)}">Agregar al carrito</button>
          <button class="btn btn-secondary" type="button" data-buy-now="${escapeHtml(product.id)}">Comprar ahora</button>
        </div>
      </div>
    </article>
  `;

  body.querySelectorAll('[data-thumb-index]').forEach(button => button.addEventListener('click', () => {
    state.activeMediaIndex = Number(button.dataset.thumbIndex);
    renderProductModal();
  }));

  body.querySelectorAll('[data-variant-id]').forEach(button => button.addEventListener('click', () => {
    state.activeVariantId = button.dataset.variantId;
    renderProductModal();
  }));

  body.querySelector('[data-add-product]')?.addEventListener('click', event => addToCart(event.currentTarget.dataset.addProduct, state.activeVariantId));
  body.querySelector('[data-buy-now]')?.addEventListener('click', event => {
    addToCart(event.currentTarget.dataset.buyNow, state.activeVariantId);
    closeProduct();
    openCart();
  });
}

function addToCart(productId, variantId = null) {
  const key = `${productId}::${variantId || 'base'}`;
  const existing = state.cart.find(item => item.key === key);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ key, id: productId, variantId: variantId || null, quantity: 1 });
  }
  persistCart();
  renderCart();
}

function updateCart(key, delta) {
  const item = state.cart.find(entry => entry.key === key);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry.key !== key);
  persistCart();
  renderCart();
}

function removeFromCart(key) {
  state.cart = state.cart.filter(entry => entry.key !== key);
  persistCart();
  renderCart();
}

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  const cartCount = document.getElementById('cartCount');
  const subtotalAmount = document.getElementById('subtotalAmount');
  const discountAmount = document.getElementById('discountAmount');
  const couponAmountEl = document.getElementById('couponAmount');
  const totalAmount = document.getElementById('totalAmount');
  const couponState = document.getElementById('couponState');
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCount) cartCount.textContent = String(count);

  const detailedItems = getCartDetailItems();
  if (!detailedItems.length) {
    if (cartItems) cartItems.innerHTML = '<div class="empty-state"><strong>Tu carrito está vacío.</strong><p>Agrega velas, sales o sets para enviar tu pedido por WhatsApp.</p></div>';
    if (subtotalAmount) subtotalAmount.textContent = formatCurrency(0);
    if (discountAmount) discountAmount.textContent = formatCurrency(0);
    if (couponAmountEl) couponAmountEl.textContent = formatCurrency(0);
    if (totalAmount) totalAmount.textContent = formatCurrency(0);
    if (couponState) couponState.textContent = 'No hay cupón aplicado.';
    return;
  }

  if (cartItems) {
    cartItems.innerHTML = detailedItems.map(item => {
      const variantText = item.selectedVariant ? `${item.selectedVariant.name}${[item.selectedVariant.presentation, item.selectedVariant.size].filter(Boolean).length ? ` · ${[item.selectedVariant.presentation, item.selectedVariant.size].filter(Boolean).join(' · ')}` : ''}` : (item.presentationSize ? `Base · ${item.presentationSize}` : 'Presentación base');
      const linePrice = currentPrice(item, item.selectedVariant) * item.quantity;
      return `
        <article class="cart-item">
          <div class="cart-item-media">${renderMedia(item.media?.[0], item.name)}</div>
          <div class="cart-item-info">
            <span class="cart-item-title">${escapeHtml(item.name)}</span>
            <span>${escapeHtml(variantText)}</span>
            <strong>${formatCurrency(linePrice)}</strong>
            <div class="qty-controls" aria-label="Cambiar cantidad de ${escapeHtml(item.name)}">
              <button type="button" data-cart-minus="${escapeHtml(item.key)}" aria-label="Disminuir cantidad">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-plus="${escapeHtml(item.key)}" aria-label="Aumentar cantidad">+</button>
            </div>
          </div>
          <div>
            <button class="btn btn-ghost" type="button" data-cart-remove="${escapeHtml(item.key)}">Quitar</button>
          </div>
        </article>
      `;
    }).join('');

    cartItems.querySelectorAll('[data-cart-minus]').forEach(button => button.addEventListener('click', () => updateCart(button.dataset.cartMinus, -1)));
    cartItems.querySelectorAll('[data-cart-plus]').forEach(button => button.addEventListener('click', () => updateCart(button.dataset.cartPlus, 1)));
    cartItems.querySelectorAll('[data-cart-remove]').forEach(button => button.addEventListener('click', () => removeFromCart(button.dataset.cartRemove)));
  }

  const subtotal = detailedItems.reduce((sum, item) => sum + Number(item.selectedVariant?.price ?? item.price) * item.quantity, 0);
  const totalBeforeCoupon = detailedItems.reduce((sum, item) => sum + currentPrice(item, item.selectedVariant) * item.quantity, 0);
  const productDiscount = subtotal - totalBeforeCoupon;
  const couponResult = getCouponDiscount(totalBeforeCoupon, state.appliedCoupon);
  const total = Math.max(totalBeforeCoupon - couponResult.amount, 0);

  if (subtotalAmount) subtotalAmount.textContent = formatCurrency(subtotal);
  if (discountAmount) discountAmount.textContent = `- ${formatCurrency(productDiscount)}`;
  if (couponAmountEl) couponAmountEl.textContent = `- ${formatCurrency(couponResult.amount)}`;
  if (totalAmount) totalAmount.textContent = formatCurrency(total);

  if (couponState) {
    if (state.appliedCoupon && couponResult.valid) {
      couponState.textContent = `Cupón aplicado: ${state.appliedCoupon.code} (${couponResult.label}).`;
      couponState.className = 'coupon-state success';
    } else if (state.appliedCoupon && !couponResult.valid) {
      couponState.textContent = couponResult.message || 'El cupón no es válido para este carrito.';
      couponState.className = 'coupon-state error';
    } else {
      couponState.textContent = 'No hay cupón aplicado.';
      couponState.className = 'coupon-state';
    }
  }
}

function handleApplyCoupon() {
  const input = document.getElementById('couponInput');
  const couponState = document.getElementById('couponState');
  const code = (input?.value || '').trim().toUpperCase();
  if (!code) {
    state.appliedCoupon = null;
    persistAppliedCoupon();
    renderCart();
    return;
  }
  const coupon = state.coupons.find(item => item.code.toUpperCase() === code && item.active);
  if (!coupon) {
    state.appliedCoupon = null;
    persistAppliedCoupon();
    if (couponState) {
      couponState.textContent = 'Cupón no encontrado o inactivo.';
      couponState.className = 'coupon-state error';
    }
    renderCart();
    return;
  }
  state.appliedCoupon = coupon;
  persistAppliedCoupon();
  renderCart();
}

function getCouponDiscount(amount, coupon) {
  if (!coupon) return { amount: 0, valid: false, label: '', message: '' };
  if (!coupon.active) return { amount: 0, valid: false, label: '', message: 'El cupón está inactivo.' };
  if (coupon.minOrder && amount < Number(coupon.minOrder)) {
    return { amount: 0, valid: false, label: '', message: `El cupón requiere una compra mínima de ${formatCurrency(coupon.minOrder)}.` };
  }
  const raw = coupon.type === 'percent' ? amount * (Number(coupon.value) / 100) : Number(coupon.value || 0);
  const result = Math.min(Number(raw.toFixed(2)), amount);
  const label = coupon.type === 'percent' ? `-${coupon.value}%` : `-${formatCurrency(coupon.value)}`;
  return { amount: result, valid: true, label, message: '' };
}

function checkoutViaWhatsApp() {
  const detailedItems = getCartDetailItems();
  if (!detailedItems.length) {
    alert('Tu carrito está vacío. Agrega al menos un producto para generar el resumen.');
    return;
  }

  const subtotal = detailedItems.reduce((sum, item) => sum + Number(item.selectedVariant?.price ?? item.price) * item.quantity, 0);
  const totalBeforeCoupon = detailedItems.reduce((sum, item) => sum + currentPrice(item, item.selectedVariant) * item.quantity, 0);
  const productDiscount = subtotal - totalBeforeCoupon;
  const couponResult = getCouponDiscount(totalBeforeCoupon, state.appliedCoupon);
  const total = Math.max(totalBeforeCoupon - couponResult.amount, 0);

  const lines = detailedItems.map(item => {
    const collection = getCollectionById(item.collectionId);
    const collectionText = collection ? ` [${collection.name}]` : '';
    const variantText = item.selectedVariant ? ` · ${item.selectedVariant.name}${[item.selectedVariant.presentation, item.selectedVariant.size].filter(Boolean).length ? ` (${[item.selectedVariant.presentation, item.selectedVariant.size].filter(Boolean).join(' · ')})` : ''}` : (item.presentationSize ? ` · Base (${item.presentationSize})` : '');
    return `• ${item.name}${variantText}${collectionText} x${item.quantity} — ${formatCurrency(currentPrice(item, item.selectedVariant) * item.quantity)}`;
  });

  const message = [
    'Hola MATRIA, quiero realizar este pedido:',
    '',
    ...lines,
    '',
    `Subtotal: ${formatCurrency(subtotal)}`,
    `Descuento productos: ${formatCurrency(productDiscount)}`,
    `Descuento cupón: ${formatCurrency(couponResult.amount)}`,
    `Total: ${formatCurrency(total)}`,
    state.appliedCoupon?.code ? `Cupón aplicado: ${state.appliedCoupon.code}` : '',
    '',
    'Quedo atenta para coordinar pago y entrega. Gracias.'
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
}

function getCartDetailItems() {
  return state.cart.map(item => {
    const product = state.products.find(productItem => productItem.id === item.id);
    if (!product) return null;
    return {
      ...product,
      key: item.key,
      quantity: item.quantity,
      selectedVariant: getDefaultVariant(product, item.variantId)
    };
  }).filter(Boolean);
}

function openCart() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
}

function getActiveVariants(product) {
  return Array.isArray(product?.variants) ? product.variants.filter(variant => variant.active !== false) : [];
}

function getDefaultVariant(product, variantId = null) {
  const variants = getActiveVariants(product);
  if (!variants.length) return null;
  if (variantId) {
    const found = variants.find(variant => variant.id === variantId);
    if (found) return found;
  }
  return variants.find(variant => variant.isDefault) || variants[0];
}

function getEffectiveDiscount(product, variant = null) {
  if (variant?.discount?.enabled && Number(variant.discount.value) > 0) return variant.discount;
  return product.discount;
}

function productStartingPrice(product) {
  const variants = getActiveVariants(product);
  if (!variants.length) return currentPrice(product);
  return variants.reduce((lowest, variant) => Math.min(lowest, currentPrice(product, variant)), currentPrice(product, variants[0]));
}

function productStartingReferencePrice(product) {
  const variants = getActiveVariants(product);
  if (!variants.length) return Number(product.price || 0);
  return variants.reduce((lowest, variant) => Math.min(lowest, Number(variant.price || 0)), Number(variants[0].price || product.price || 0));
}

function getBestDiscount(product) {
  const variants = getActiveVariants(product);
  const discounts = variants.map(variant => getEffectiveDiscount(product, variant)).filter(discount => discount?.enabled && Number(discount.value) > 0);
  if (discounts.length) return discounts.sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  return product.discount;
}

function productMaxDiscountValue(product) {
  const variants = getActiveVariants(product);
  if (!variants.length) return Number(product.price || 0) - currentPrice(product);
  return variants.reduce((max, variant) => Math.max(max, Number(variant.price || 0) - currentPrice(product, variant)), 0);
}

function currentPrice(product, variant = null) {
  const base = Number(variant?.price ?? product.price ?? 0);
  const discount = getEffectiveDiscount(product, variant);
  if (!discount?.enabled || Number(discount.value) <= 0) return Number(base.toFixed(2));
  const amount = discount.type === 'fixed' ? Number(discount.value || 0) : base * (Number(discount.value || 0) / 100);
  return Number(Math.max(base - Math.min(amount, base), 0).toFixed(2));
}

function renderDiscountLabel(discount) {
  if (!discount || !discount.enabled || Number(discount.value) <= 0) return 'Sin descuento';
  return discount.type === 'fixed' ? `-${formatCurrency(discount.value)}` : `-${discount.value}%`;
}

function renderMedia(media, fallbackAlt = '') {
  if (!media || !media.src) return '<div class="media-fallback" aria-hidden="true"></div>';
  if (media.type === 'video') {
    return `<video muted playsinline loop autoplay title="${escapeHtml(media.title || fallbackAlt)}"><source src="${escapeHtml(media.src)}" /></video>`;
  }
  return `<img src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt || fallbackAlt)}" title="${escapeHtml(media.title || '')}" loading="lazy" />`;
}

function getCollectionById(collectionId) {
  return state.collections.find(collection => collection.id === collectionId) || null;
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

function persistCart() {
  writeStorage(CART_STORAGE_KEY, state.cart);
}

function persistAppliedCoupon() {
  writeStorage(APPLIED_COUPON_STORAGE_KEY, state.appliedCoupon);
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
    id: item?.id || `client-comment-${index + 1}` ,
    author: item?.author || item?.clientName || item?.name || 'Cliente MATRIA',
    role: item?.role || '',
    quote: item?.quote || item?.comment || '',
    rating: Number(item?.rating || 5),
    sortOrder: Number(item?.sortOrder || 0),
    linkedPhotoId: item?.linkedPhotoId || '',
    active: item?.active !== false
  })).filter(item => item.quote);
}
