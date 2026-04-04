const WHATSAPP_NUMBER = '51999999999';
const COLLECTIONS_STORAGE_KEY = 'matria-collections-v3';
const PRODUCTS_STORAGE_KEY = 'matria-products-v3';
const COUPONS_STORAGE_KEY = 'matria-coupons-v3';
const CART_STORAGE_KEY = 'matria-cart-v3';
const APPLIED_COUPON_STORAGE_KEY = 'matria-applied-coupon-v3';

const testimonials = [
  {
    quote: 'La presentación es preciosa y el aroma realmente transforma el ambiente. Se siente como un regalo para una misma.',
    author: 'Mariana R.',
    role: 'Clienta frecuente'
  },
  {
    quote: 'Compré un set para regalar y fue perfecto. La estética es delicada, sofisticada y muy distinta a lo masivo.',
    author: 'Camila V.',
    role: 'Compró para gifting'
  },
  {
    quote: 'Me encantó la experiencia de compra y lo fácil que fue cerrar el pedido por WhatsApp. Todo se sintió cercano y cuidado.',
    author: 'Lucía P.',
    role: 'Nueva clienta'
  }
];

const state = {
  collections: [],
  products: [],
  filteredProducts: [],
  coupons: [],
  cart: readStorage(CART_STORAGE_KEY, []),
  activeProduct: null,
  activeMediaIndex: 0,
  appliedCoupon: readStorage(APPLIED_COUPON_STORAGE_KEY, null)
};

document.addEventListener('DOMContentLoaded', initStorefront);

async function initStorefront() {
  if (document.body.dataset.page !== 'storefront') return;

  setYear();
  setupNav();
  bindForms();
  renderTestimonials();
  await loadCatalogData();
  bindStorefrontEvents();
  applyFilters();
  renderCollections();
  renderCart();
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
  const newsletterForm = document.getElementById('newsletterForm');
  const contactForm = document.getElementById('contactForm');

  newsletterForm?.addEventListener('submit', event => {
    event.preventDefault();
    alert('Gracias por suscribirte. Esta versión HTML deja listo el formulario para conectarlo luego con tu herramienta favorita.');
    event.target.reset();
  });

  contactForm?.addEventListener('submit', event => {
    event.preventDefault();
    alert('Tu consulta fue preparada. En la siguiente fase, este formulario puede conectarse con correo, CRM o automatizaciones.');
    event.target.reset();
  });
}

function renderTestimonials() {
  const container = document.getElementById('testimonialsGrid');
  if (!container) return;

  container.innerHTML = testimonials.map(item => `
    <article class="testimonial-card reveal">
      <div class="stars" aria-hidden="true">★★★★★</div>
      <p>“${escapeHtml(item.quote)}”</p>
      <div class="testimonial-author">
        <strong>${escapeHtml(item.author)}</strong>
        <span>${escapeHtml(item.role)}</span>
      </div>
    </article>
  `).join('');
}

async function loadCatalogData() {
  const [collectionsDefault, productsDefault, couponsDefault] = await Promise.all([
    fetchJson('assets/data/collections.json', []),
    fetchJson('assets/data/products.json', []),
    fetchJson('assets/data/coupons.json', [])
  ]);

  const storedCollections = readStorage(COLLECTIONS_STORAGE_KEY, null);
  const storedProducts = readStorage(PRODUCTS_STORAGE_KEY, null);
  const storedCoupons = readStorage(COUPONS_STORAGE_KEY, null);

  state.collections = normalizeCollections(storedCollections || collectionsDefault).filter(collection => collection.active !== false);
  state.products = normalizeProducts(storedProducts || productsDefault).filter(product => state.collections.some(collection => collection.id === product.collectionId));
  state.coupons = normalizeCoupons(storedCoupons || couponsDefault);

  populateCollectionFilter();
  populateCategoryFilter();
}

function bindStorefrontEvents() {
  const searchInput = document.getElementById('searchInput');
  const collectionFilter = document.getElementById('collectionFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const formatFilter = document.getElementById('formatFilter');
  const cartButton = document.getElementById('cartButton');
  const applyCouponButton = document.getElementById('applyCouponButton');
  const checkoutWhatsApp = document.getElementById('checkoutWhatsApp');

  [searchInput, collectionFilter, categoryFilter, sortFilter, formatFilter].forEach(control => {
    control?.addEventListener('input', applyFilters);
    control?.addEventListener('change', applyFilters);
  });

  cartButton?.addEventListener('click', openCart);
  document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', openCart));
  document.querySelectorAll('[data-close-cart]').forEach(button => button.addEventListener('click', closeCart));
  document.querySelectorAll('[data-close-product]').forEach(button => button.addEventListener('click', closeProduct));

  applyCouponButton?.addEventListener('click', handleApplyCoupon);
  checkoutWhatsApp?.addEventListener('click', checkoutViaWhatsApp);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeCart();
      closeProduct();
    }
  });
}

function populateCollectionFilter() {
  const select = document.getElementById('collectionFilter');
  if (!select) return;
  const collections = [...state.collections].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name, 'es'));
  select.innerHTML = `<option value="todos">Todas</option>${collections.map(collection => `<option value="${escapeHtml(collection.id)}">${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}</option>`).join('')}`;
}

function populateCategoryFilter() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;
  const categories = [...new Set(state.products.map(product => product.category))].sort((a, b) => a.localeCompare(b, 'es'));
  select.innerHTML = `<option value="todos">Todas</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}`;
}

function renderCollections() {
  const grid = document.getElementById('collectionsGrid');
  if (!grid) return;

  const visibleCollections = [...state.collections]
    .filter(collection => collection.showOnHome)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name, 'es'));

  if (!visibleCollections.length) {
    grid.innerHTML = '<div class="empty-state"><strong>No hay colecciones activas.</strong><p>Agrega colecciones desde tu panel interno y vuelve a exportar <code>collections.json</code>.</p></div>';
    return;
  }

  grid.innerHTML = visibleCollections.map(collection => {
    const media = collection.media?.[0];
    const linkedProducts = state.products.filter(product => product.collectionId === collection.id).length;
    return `
      <article class="collection-card reveal">
        <div class="collection-media">
          ${renderMedia(media, collection.name)}
        </div>
        <div class="collection-body">
          <div class="collection-top">
            <span class="eyebrow">${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}</span>
            <h3>${escapeHtml(collection.title || collection.name)}</h3>
            <p>${escapeHtml(collection.tagline || '')}</p>
          </div>
          <div class="collection-meta">
            ${collection.packName ? `<span class="badge">${escapeHtml(collection.packName)}</span>` : ''}
            <span class="badge">${linkedProducts} producto${linkedProducts === 1 ? '' : 's'}</span>
          </div>
          <p class="collection-story">${escapeHtml(collection.packStory || collection.story || '')}</p>
          <div class="product-actions">
            <button class="btn btn-primary" type="button" data-filter-collection="${escapeHtml(collection.id)}">${escapeHtml(collection.ctaLabel || 'Ver colección')}</button>
            <button class="btn btn-ghost" type="button" data-see-story="${escapeHtml(collection.id)}">Leer concepto</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-filter-collection]').forEach(button => {
    button.addEventListener('click', () => filterByCollection(button.dataset.filterCollection));
  });

  grid.querySelectorAll('[data-see-story]').forEach(button => {
    button.addEventListener('click', () => {
      const collection = getCollectionById(button.dataset.seeStory);
      if (!collection) return;
      alert(`${collection.name}\n\n${collection.story || collection.packStory || ''}`);
    });
  });
}

function filterByCollection(collectionId) {
  const filter = document.getElementById('collectionFilter');
  if (filter) filter.value = collectionId;
  applyFilters();
  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function applyFilters() {
  const query = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const collectionId = document.getElementById('collectionFilter')?.value || 'todos';
  const category = document.getElementById('categoryFilter')?.value || 'todos';
  const format = document.getElementById('formatFilter')?.value || 'todos';
  const sort = document.getElementById('sortFilter')?.value || 'destacados';

  let items = [...state.products].filter(product => {
    const collection = getCollectionById(product.collectionId);
    const text = [product.name, product.category, product.description, product.shortDescription, product.salesSpeech, product.technicalBlend, collection?.name || '', collection?.tagline || '']
      .join(' ')
      .toLowerCase();

    return (!query || text.includes(query))
      && (collectionId === 'todos' || product.collectionId === collectionId)
      && (category === 'todos' || product.category === category)
      && (format === 'todos' || product.format === format);
  });

  if (sort === 'precio-asc') items.sort((a, b) => currentPrice(a) - currentPrice(b));
  if (sort === 'precio-desc') items.sort((a, b) => currentPrice(b) - currentPrice(a));
  if (sort === 'descuento') items.sort((a, b) => discountAmount(a) - discountAmount(b)).reverse();
  if (sort === 'destacados') items.sort((a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)) || discountAmount(b) - discountAmount(a));

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
    const current = currentPrice(product);
    const hasDiscount = Boolean(product.discount && Number(product.discount.value) > 0);
    const collection = getCollectionById(product.collectionId);

    return `
      <article class="product-card reveal">
        <div class="product-media">
          ${renderMedia(media, product.name)}
          <div class="product-badges">
            ${product.badge ? `<span class="badge">${escapeHtml(product.badge)}</span>` : ''}
            ${collection ? `<span class="badge">${escapeHtml(collection.name)}</span>` : ''}
            ${hasDiscount ? `<span class="badge">${renderDiscountLabel(product.discount)}</span>` : ''}
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
            ${product.technicalBlend ? `<span class="assistive"><strong>Mezcla:</strong> ${escapeHtml(product.technicalBlend)}</span>` : ''}
            <div class="price-wrap">
              <span class="price-current">${formatCurrency(current)}</span>
              ${hasDiscount ? `<span class="price-old">${formatCurrency(product.price)}</span>` : ''}
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

  grid.querySelectorAll('[data-view-product]').forEach(button => {
    button.addEventListener('click', () => openProduct(button.dataset.viewProduct));
  });

  grid.querySelectorAll('[data-add-product]').forEach(button => {
    button.addEventListener('click', () => addToCart(button.dataset.addProduct));
  });

  initRevealOnScroll();
}

function openProduct(productId) {
  const product = state.products.find(item => item.id === productId);
  if (!product) return;

  state.activeProduct = product;
  state.activeMediaIndex = 0;

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

  const current = currentPrice(product);
  const activeMedia = product.media?.[state.activeMediaIndex] || product.media?.[0];
  const collection = getCollectionById(product.collectionId);

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
          <span class="price-current">${formatCurrency(current)}</span>
          ${product.discount && Number(product.discount.value) > 0 ? `<span class="price-old">${formatCurrency(product.price)}</span><span class="badge">${renderDiscountLabel(product.discount)}</span>` : ''}
        </div>
        ${collection ? `<div class="notice"><strong>Colección:</strong> ${escapeHtml(collection.code ? `${collection.code}. ${collection.name}` : collection.name)}<br />${escapeHtml(collection.tagline || '')}</div>` : ''}
        ${product.technicalBlend ? `<div class="spec-line"><strong>Mezcla técnica:</strong> ${escapeHtml(product.technicalBlend)}</div>` : ''}
        ${product.salesSpeech ? `<div class="spec-line"><strong>Gancho de venta:</strong> ${escapeHtml(product.salesSpeech)}</div>` : ''}
        <p>${escapeHtml(product.description || '')}</p>
        ${Array.isArray(product.descriptions) && product.descriptions.length ? `<div class="description-stack">${product.descriptions.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div>` : ''}
        <div>
          <strong>Incluye</strong>
          <ul>
            ${(product.features || []).map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}
          </ul>
        </div>
        <div class="product-actions">
          <button class="btn btn-primary" type="button" data-add-product="${escapeHtml(product.id)}">Agregar al carrito</button>
          <button class="btn btn-secondary" type="button" data-buy-now="${escapeHtml(product.id)}">Comprar ahora</button>
        </div>
      </div>
    </article>
  `;

  body.querySelectorAll('[data-thumb-index]').forEach(button => {
    button.addEventListener('click', () => {
      state.activeMediaIndex = Number(button.dataset.thumbIndex);
      renderProductModal();
    });
  });

  body.querySelector('[data-add-product]')?.addEventListener('click', event => addToCart(event.currentTarget.dataset.addProduct));
  body.querySelector('[data-buy-now]')?.addEventListener('click', event => {
    addToCart(event.currentTarget.dataset.buyNow);
    closeProduct();
    openCart();
  });
}

function addToCart(productId) {
  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ id: productId, quantity: 1 });
  }
  persistCart();
  renderCart();
}

function updateCart(productId, delta) {
  const item = state.cart.find(entry => entry.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry.id !== productId);
  persistCart();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(entry => entry.id !== productId);
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

  const detailedItems = state.cart.map(item => {
    const product = state.products.find(product => product.id === item.id);
    return product ? { ...product, quantity: item.quantity } : null;
  }).filter(Boolean);

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
      const linePrice = currentPrice(item) * item.quantity;
      return `
        <article class="cart-item">
          <div class="cart-item-media">${renderMedia(item.media?.[0], item.name)}</div>
          <div class="cart-item-info">
            <span class="cart-item-title">${escapeHtml(item.name)}</span>
            <span>${escapeHtml(item.category)}</span>
            <strong>${formatCurrency(linePrice)}</strong>
            <div class="qty-controls" aria-label="Cambiar cantidad de ${escapeHtml(item.name)}">
              <button type="button" data-cart-minus="${escapeHtml(item.id)}" aria-label="Disminuir cantidad">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-plus="${escapeHtml(item.id)}" aria-label="Aumentar cantidad">+</button>
            </div>
          </div>
          <div>
            <button class="btn btn-ghost" type="button" data-cart-remove="${escapeHtml(item.id)}">Quitar</button>
          </div>
        </article>
      `;
    }).join('');

    cartItems.querySelectorAll('[data-cart-minus]').forEach(button => button.addEventListener('click', () => updateCart(button.dataset.cartMinus, -1)));
    cartItems.querySelectorAll('[data-cart-plus]').forEach(button => button.addEventListener('click', () => updateCart(button.dataset.cartPlus, 1)));
    cartItems.querySelectorAll('[data-cart-remove]').forEach(button => button.addEventListener('click', () => removeFromCart(button.dataset.cartRemove)));
  }

  const subtotal = detailedItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const totalBeforeCoupon = detailedItems.reduce((sum, item) => sum + currentPrice(item) * item.quantity, 0);
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

  const raw = coupon.type === 'percent'
    ? amount * (Number(coupon.value) / 100)
    : Number(coupon.value || 0);

  const result = Math.min(Number(raw.toFixed(2)), amount);
  const label = coupon.type === 'percent' ? `-${coupon.value}%` : `-${formatCurrency(coupon.value)}`;
  return { amount: result, valid: true, label, message: '' };
}

function checkoutViaWhatsApp() {
  if (!state.cart.length) {
    alert('Tu carrito está vacío. Agrega al menos un producto para generar el resumen.');
    return;
  }

  const detailedItems = state.cart.map(item => {
    const product = state.products.find(product => product.id === item.id);
    return product ? { ...product, quantity: item.quantity } : null;
  }).filter(Boolean);

  const subtotal = detailedItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const totalBeforeCoupon = detailedItems.reduce((sum, item) => sum + currentPrice(item) * item.quantity, 0);
  const productDiscount = subtotal - totalBeforeCoupon;
  const couponResult = getCouponDiscount(totalBeforeCoupon, state.appliedCoupon);
  const total = Math.max(totalBeforeCoupon - couponResult.amount, 0);

  const lines = detailedItems.map(item => {
    const collection = getCollectionById(item.collectionId);
    const collectionText = collection ? ` [${collection.name}]` : '';
    return `• ${item.name}${collectionText} x${item.quantity} — ${formatCurrency(currentPrice(item) * item.quantity)}`;
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

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
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

function discountAmount(product) {
  if (!product.discount || !product.discount.enabled || Number(product.discount.value) <= 0) return 0;
  const base = Number(product.price || 0);
  const amount = product.discount.type === 'fixed'
    ? Number(product.discount.value || 0)
    : base * (Number(product.discount.value || 0) / 100);
  return Number(Math.min(amount, base).toFixed(2));
}

function currentPrice(product) {
  const base = Number(product.price || 0);
  return Number(Math.max(base - discountAmount(product), 0).toFixed(2));
}

function renderDiscountLabel(discount) {
  if (!discount || !discount.enabled || Number(discount.value) <= 0) return 'Sin descuento';
  return discount.type === 'fixed' ? `-${formatCurrency(discount.value)}` : `-${discount.value}%`;
}

function renderMedia(media, fallbackAlt = '') {
  if (!media || !media.src) {
    return '<div class="media-fallback" aria-hidden="true"></div>';
  }

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

function persistCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
}

function persistAppliedCoupon() {
  localStorage.setItem(APPLIED_COUPON_STORAGE_KEY, JSON.stringify(state.appliedCoupon));
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
