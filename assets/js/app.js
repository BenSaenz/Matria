const WHATSAPP_NUMBER = '51999999999';
const PRODUCTS_STORAGE_KEY = 'matria-products-v2';
const COUPONS_STORAGE_KEY = 'matria-coupons-v2';
const CART_STORAGE_KEY = 'matria-cart-v2';
const APPLIED_COUPON_STORAGE_KEY = 'matria-applied-coupon-v2';

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
  const [productsDefault, couponsDefault] = await Promise.all([
    fetchJson('assets/data/products.json', []),
    fetchJson('assets/data/coupons.json', [])
  ]);

  const storedProducts = readStorage(PRODUCTS_STORAGE_KEY, null);
  const storedCoupons = readStorage(COUPONS_STORAGE_KEY, null);

  state.products = normalizeProducts(storedProducts || productsDefault);
  state.coupons = normalizeCoupons(storedCoupons || couponsDefault);

  populateCategoryFilter();
}

function bindStorefrontEvents() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const formatFilter = document.getElementById('formatFilter');
  const cartButton = document.getElementById('cartButton');
  const applyCouponButton = document.getElementById('applyCouponButton');
  const checkoutWhatsApp = document.getElementById('checkoutWhatsApp');

  [searchInput, categoryFilter, sortFilter, formatFilter].forEach(control => {
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

function populateCategoryFilter() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;
  const categories = [...new Set(state.products.map(product => product.category))].sort();
  select.innerHTML = `<option value="todos">Todas</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}`;
}

function applyFilters() {
  const query = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const category = document.getElementById('categoryFilter')?.value || 'todos';
  const format = document.getElementById('formatFilter')?.value || 'todos';
  const sort = document.getElementById('sortFilter')?.value || 'destacados';

  let items = [...state.products].filter(product => {
    const text = [product.name, product.category, product.description, product.shortDescription].join(' ').toLowerCase();
    return (!query || text.includes(query)) && (category === 'todos' || product.category === category) && (format === 'todos' || product.format === format);
  });

  if (sort === 'precio-asc') items.sort((a, b) => currentPrice(a) - currentPrice(b));
  if (sort === 'precio-desc') items.sort((a, b) => currentPrice(b) - currentPrice(a));
  if (sort === 'descuento') items.sort((a, b) => discountValue(a) - discountValue(b)).reverse();
  if (sort === 'destacados') items.sort((a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)) || discountValue(b) - discountValue(a));

  state.filteredProducts = items;
  renderProducts();
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

    return `
      <article class="product-card reveal">
        <div class="product-media">
          ${renderMedia(media, product.name)}
          <div class="product-badges">
            ${product.badge ? `<span class="badge">${escapeHtml(product.badge)}</span>` : ''}
            ${hasDiscount ? `<span class="badge">${renderDiscountLabel(product.discount)}</span>` : ''}
          </div>
        </div>
        <div class="product-body">
          <div class="product-top">
            <span class="eyebrow">${escapeHtml(product.category)} · ${product.format === 'regalo' ? 'regalo' : 'ritual individual'}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.shortDescription || product.description || '')}</p>
          </div>
          <div class="product-meta">
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
        <p>${escapeHtml(product.description || '')}</p>
        <div class="notice">Este componente admite múltiples imágenes o videos por producto. Puedes gestionarlos desde <strong>admin.html</strong>.</div>
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

  const lines = detailedItems.map(item => `• ${item.name} x${item.quantity} — ${formatCurrency(currentPrice(item) * item.quantity)}`);
  const couponLine = state.appliedCoupon && couponResult.valid ? `Cupón: ${state.appliedCoupon.code} — ${couponResult.label}` : 'Cupón: no aplicado';

  const message = [
    'Hola MATRIA, quiero realizar este pedido:',
    '',
    ...lines,
    '',
    `Subtotal: ${formatCurrency(subtotal)}`,
    `Descuento productos: ${formatCurrency(productDiscount)}`,
    `${couponLine}`,
    `Descuento cupón: ${formatCurrency(couponResult.amount)}`,
    `Total: ${formatCurrency(total)}`,
    '',
    'Quedo atenta para coordinar pago y entrega. Gracias.'
  ].join('\n');

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

function currentPrice(product) {
  const base = Number(product.price || 0);
  const discount = product.discount;
  if (!discount || !discount.enabled || Number(discount.value) <= 0) return Number(base.toFixed(2));

  const amount = discount.type === 'fixed'
    ? Number(discount.value)
    : base * (Number(discount.value) / 100);

  return Number(Math.max(base - amount, 0).toFixed(2));
}

function discountValue(product) {
  return Number(product.discount?.enabled ? product.discount.value || 0 : 0);
}

function renderDiscountLabel(discount) {
  if (!discount || !discount.enabled || Number(discount.value) <= 0) return '';
  return discount.type === 'fixed' ? `-${formatCurrency(discount.value)}` : `-${discount.value}%`;
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

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar');
    return await response.json();
  } catch {
    return fallback;
  }
}

function persistCart() {
  writeStorage(CART_STORAGE_KEY, state.cart);
}

function persistAppliedCoupon() {
  writeStorage(APPLIED_COUPON_STORAGE_KEY, state.appliedCoupon);
}

function renderMedia(media, alt = '') {
  if (!media) return '<div aria-hidden="true" style="width:100%;height:100%;background:linear-gradient(160deg,#d8cec4 0%,#c6b7a8 45%,#f2ede6 100%);"></div>';
  if (media.type === 'video') {
    return `<video muted playsinline loop autoplay aria-label="${escapeHtml(alt)}"><source src="${escapeHtml(media.src)}" /></video>`;
  }
  return `<img src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt || alt)}" loading="lazy" />`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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
