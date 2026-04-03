(() => {
  const WHATSAPP_NUMBER = '51907813883';
  const STORAGE_KEY = 'matria-products-v1';
  const CART_KEY = 'matria-cart-v1';

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
    cart: loadCart(),
    activeProduct: null,
    activeMediaIndex: 0
  };

  const elements = {
    year: document.getElementById('year'),
    navToggle: document.getElementById('navToggle'),
    primaryNav: document.getElementById('primaryNav'),
    cartButton: document.getElementById('cartButton'),
    cartCount: document.getElementById('cartCount'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartItems: document.getElementById('cartItems'),
    subtotalAmount: document.getElementById('subtotalAmount'),
    discountAmount: document.getElementById('discountAmount'),
    totalAmount: document.getElementById('totalAmount'),
    checkoutWhatsApp: document.getElementById('checkoutWhatsApp'),
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    sortFilter: document.getElementById('sortFilter'),
    formatFilter: document.getElementById('formatFilter'),
    productsGrid: document.getElementById('productsGrid'),
    productModal: document.getElementById('productModal'),
    productModalBody: document.getElementById('productModalBody'),
    productModalTitle: document.getElementById('productModalTitle'),
    testimonialsGrid: document.getElementById('testimonialsGrid'),
    newsletterForm: document.getElementById('newsletterForm'),
    contactForm: document.getElementById('contactForm'),
    productForm: document.getElementById('productForm')
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    elements.year.textContent = new Date().getFullYear();
    renderTestimonials();
    bindEvents();
    await loadProducts();
    applyFilters();
    renderCart();
    initRevealOnScroll();
  }

  async function loadProducts() {
    try {
      const response = await fetch('assets/data/products.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar products.json');
      const baseProducts = await response.json();
      const customProducts = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
      state.products = [...baseProducts, ...customProducts];
    } catch (error) {
      console.error(error);
      state.products = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
      if (!state.products.length) {
        elements.productsGrid.innerHTML = '<div class="empty-state"><strong>No se pudo cargar el catálogo.</strong><p>Verifica que el archivo assets/data/products.json exista y esté publicado.</p></div>';
      }
    }
  }

  function bindEvents() {
    elements.navToggle?.addEventListener('click', () => {
      const isOpen = elements.primaryNav.classList.toggle('is-open');
      elements.navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 820) {
          elements.primaryNav.classList.remove('is-open');
          elements.navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });

    [elements.searchInput, elements.categoryFilter, elements.sortFilter, elements.formatFilter].forEach(control => {
      control?.addEventListener('input', applyFilters);
      control?.addEventListener('change', applyFilters);
    });

    elements.cartButton?.addEventListener('click', openCart);
    document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', openCart));
    document.querySelectorAll('[data-close-cart]').forEach(button => button.addEventListener('click', closeCart));
    document.querySelectorAll('[data-close-product]').forEach(button => button.addEventListener('click', closeProduct));
    elements.checkoutWhatsApp?.addEventListener('click', checkoutViaWhatsApp);

    elements.newsletterForm?.addEventListener('submit', event => {
      event.preventDefault();
      const email = document.getElementById('newsletterEmail').value.trim();
      if (!email) return;
      alert('Gracias por suscribirte. Este formulario quedó listo para conectarlo con tu herramienta favorita.');
      event.target.reset();
    });

    elements.contactForm?.addEventListener('submit', event => {
      event.preventDefault();
      alert('Tu consulta fue preparada. En la siguiente fase, este formulario puede conectarse con correo o automatizaciones.');
      event.target.reset();
    });

    elements.productForm?.addEventListener('submit', handleProductSubmit);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeCart();
        closeProduct();
      }
    });
  }

  function applyFilters() {
    const query = elements.searchInput.value.trim().toLowerCase();
    const category = elements.categoryFilter.value;
    const format = elements.formatFilter.value;
    const sort = elements.sortFilter.value;

    let items = [...state.products].filter(product => {
      const matchesQuery = !query || [product.name, product.category, product.description, product.shortDescription].join(' ').toLowerCase().includes(query);
      const matchesCategory = category === 'todos' || product.category === category;
      const matchesFormat = format === 'todos' || product.format === format;
      return matchesQuery && matchesCategory && matchesFormat;
    });

    if (sort === 'precio-asc') items.sort((a, b) => currentPrice(a) - currentPrice(b));
    if (sort === 'precio-desc') items.sort((a, b) => currentPrice(b) - currentPrice(a));
    if (sort === 'descuento') items.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    if (sort === 'destacados') items.sort((a, b) => (b.discount || 0) - (a.discount || 0));

    state.filteredProducts = items;
    renderProducts();
  }

  function renderProducts() {
    if (!state.filteredProducts.length) {
      elements.productsGrid.innerHTML = '<div class="empty-state"><strong>No encontramos productos con esos filtros.</strong><p>Prueba otra búsqueda o restablece las categorías.</p></div>';
      return;
    }

    elements.productsGrid.innerHTML = state.filteredProducts.map(product => {
      const current = currentPrice(product);
      const media = product.media?.[0];
      const hasDiscount = Number(product.discount) > 0;

      return `
        <article class="product-card reveal">
          <div class="product-media">
            ${renderMedia(media, product.name)}
            <div class="product-badges">
              ${product.badge ? `<span class="badge">${product.badge}</span>` : ''}
              ${hasDiscount ? `<span class="badge">-${product.discount}%</span>` : ''}
            </div>
          </div>
          <div class="product-body">
            <div class="product-top">
              <span class="eyebrow">${product.category} · ${product.format === 'regalo' ? 'regalo' : 'ritual individual'}</span>
              <h3>${product.name}</h3>
              <p>${product.shortDescription || product.description}</p>
            </div>
            <div class="product-meta">
              <div class="price-wrap">
                <span class="price-current">${formatCurrency(current)}</span>
                ${hasDiscount ? `<span class="price-old">${formatCurrency(product.price)}</span>` : ''}
              </div>
            </div>
            <div class="product-actions">
              <button class="btn btn-secondary" type="button" data-view-product="${product.id}">Ver detalle</button>
              <button class="btn btn-primary" type="button" data-add-product="${product.id}">Agregar</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    elements.productsGrid.querySelectorAll('[data-view-product]').forEach(button => {
      button.addEventListener('click', () => openProduct(button.dataset.viewProduct));
    });

    elements.productsGrid.querySelectorAll('[data-add-product]').forEach(button => {
      button.addEventListener('click', () => addToCart(button.dataset.addProduct));
    });

    initRevealOnScroll();
  }

  function renderTestimonials() {
    elements.testimonialsGrid.innerHTML = testimonials.map(item => `
      <article class="testimonial-card reveal">
        <div class="stars" aria-hidden="true">★★★★★</div>
        <p>“${item.quote}”</p>
        <div class="testimonial-author">
          <strong>${item.author}</strong>
          <span>${item.role}</span>
        </div>
      </article>
    `).join('');
  }

  function openProduct(productId) {
    const product = state.products.find(item => item.id === productId);
    if (!product) return;
    state.activeProduct = product;
    state.activeMediaIndex = 0;
    elements.productModal.classList.add('is-open');
    elements.productModal.setAttribute('aria-hidden', 'false');
    elements.productModalTitle.textContent = product.name;
    renderProductModal();
  }

  function closeProduct() {
    elements.productModal.classList.remove('is-open');
    elements.productModal.setAttribute('aria-hidden', 'true');
  }

  function renderProductModal() {
    const product = state.activeProduct;
    if (!product) return;
    const current = currentPrice(product);
    const activeMedia = product.media?.[state.activeMediaIndex] || product.media?.[0];

    elements.productModalBody.innerHTML = `
      <article class="product-detail">
        <div class="product-gallery">
          <div class="gallery-main">${renderMedia(activeMedia, product.name)}</div>
          <div class="gallery-thumbs">
            ${(product.media || []).map((item, index) => `
              <button class="thumb ${index === state.activeMediaIndex ? 'is-active' : ''}" type="button" data-thumb-index="${index}" aria-label="Ver imagen ${index + 1} de ${product.name}">
                ${renderMedia(item, product.name)}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="product-info">
          <span class="eyebrow">${product.category} · ${product.format === 'regalo' ? 'regalo' : 'ritual individual'}</span>
          <h2>${product.name}</h2>
          <div class="price-wrap">
            <span class="price-current">${formatCurrency(current)}</span>
            ${product.discount ? `<span class="price-old">${formatCurrency(product.price)}</span>` : ''}
            ${product.discount ? `<span class="badge">-${product.discount}%</span>` : ''}
          </div>
          <p>${product.description}</p>
          <div class="notice">Cada producto admite varias imágenes o videos. Solo debes agregar nuevas rutas dentro de products.json.</div>
          <div>
            <strong>Incluye</strong>
            <ul>${(product.features || []).map(feature => `<li>${feature}</li>`).join('')}</ul>
          </div>
          <div class="product-actions">
            <button class="btn btn-primary" type="button" data-add-product="${product.id}">Agregar al carrito</button>
            <button class="btn btn-secondary" type="button" data-buy-now="${product.id}">Comprar ahora</button>
          </div>
        </div>
      </article>
    `;

    elements.productModalBody.querySelectorAll('[data-thumb-index]').forEach(button => {
      button.addEventListener('click', () => {
        state.activeMediaIndex = Number(button.dataset.thumbIndex);
        renderProductModal();
      });
    });

    elements.productModalBody.querySelector('[data-add-product]')?.addEventListener('click', event => {
      addToCart(event.currentTarget.dataset.addProduct);
    });

    elements.productModalBody.querySelector('[data-buy-now]')?.addEventListener('click', event => {
      addToCart(event.currentTarget.dataset.buyNow);
      closeProduct();
      openCart();
    });
  }

  function renderMedia(media, alt = '') {
    if (!media) return '<div aria-hidden="true" style="width:100%;height:100%;background:linear-gradient(160deg,#d8cec4 0%,#c6b7a8 45%,#f2ede6 100%);"></div>';
    if (media.type === 'video') {
      return `<video muted playsinline loop autoplay aria-label="${escapeHtml(alt)}"><source src="${escapeHtml(media.src)}" /></video>`;
    }
    return `<img src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt || alt)}" loading="lazy" />`;
  }

  function addToCart(productId) {
    const product = state.products.find(item => item.id === productId);
    if (!product) return;
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
    if (item.quantity <= 0) {
      state.cart = state.cart.filter(entry => entry.id !== productId);
    }
    persistCart();
    renderCart();
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(entry => entry.id !== productId);
    persistCart();
    renderCart();
  }

  function renderCart() {
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartCount.textContent = String(count);

    if (!state.cart.length) {
      elements.cartItems.innerHTML = '<div class="empty-state"><strong>Tu carrito está vacío.</strong><p>Agrega velas, sales o sets para enviar tu pedido por WhatsApp.</p></div>';
      elements.subtotalAmount.textContent = formatCurrency(0);
      elements.discountAmount.textContent = formatCurrency(0);
      elements.totalAmount.textContent = formatCurrency(0);
      return;
    }

    const detailedItems = state.cart.map(item => {
      const product = state.products.find(product => product.id === item.id);
      return product ? { ...product, quantity: item.quantity } : null;
    }).filter(Boolean);

    elements.cartItems.innerHTML = detailedItems.map(item => {
      const linePrice = currentPrice(item) * item.quantity;
      return `
        <article class="cart-item">
          <div class="cart-item-media">${renderMedia(item.media?.[0], item.name)}</div>
          <div class="cart-item-info">
            <span class="cart-item-title">${item.name}</span>
            <span>${item.category}</span>
            <strong>${formatCurrency(linePrice)}</strong>
            <div class="qty-controls" aria-label="Cambiar cantidad de ${item.name}">
              <button type="button" data-cart-minus="${item.id}" aria-label="Disminuir cantidad">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-plus="${item.id}" aria-label="Aumentar cantidad">+</button>
            </div>
          </div>
          <div>
            <button class="btn btn-ghost" type="button" data-cart-remove="${item.id}">Quitar</button>
          </div>
        </article>
      `;
    }).join('');

    elements.cartItems.querySelectorAll('[data-cart-minus]').forEach(button => {
      button.addEventListener('click', () => updateCart(button.dataset.cartMinus, -1));
    });
    elements.cartItems.querySelectorAll('[data-cart-plus]').forEach(button => {
      button.addEventListener('click', () => updateCart(button.dataset.cartPlus, 1));
    });
    elements.cartItems.querySelectorAll('[data-cart-remove]').forEach(button => {
      button.addEventListener('click', () => removeFromCart(button.dataset.cartRemove));
    });

    const subtotal = detailedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = detailedItems.reduce((sum, item) => sum + currentPrice(item) * item.quantity, 0);
    const discount = subtotal - total;

    elements.subtotalAmount.textContent = formatCurrency(subtotal);
    elements.discountAmount.textContent = `- ${formatCurrency(discount)}`;
    elements.totalAmount.textContent = formatCurrency(total);
  }

  function checkoutViaWhatsApp() {
    if (!state.cart.length) {
      alert('Tu carrito está vacío. Agrega al menos un producto para generar el resumen.');
      return;
    }

    const lines = state.cart.map(item => {
      const product = state.products.find(product => product.id === item.id);
      if (!product) return '';
      return `• ${product.name} x${item.quantity} — ${formatCurrency(currentPrice(product) * item.quantity)}`;
    }).filter(Boolean);

    const subtotal = state.cart.reduce((sum, item) => {
      const product = state.products.find(product => product.id === item.id);
      return product ? sum + product.price * item.quantity : sum;
    }, 0);
    const total = state.cart.reduce((sum, item) => {
      const product = state.products.find(product => product.id === item.id);
      return product ? sum + currentPrice(product) * item.quantity : sum;
    }, 0);
    const discount = subtotal - total;

    const message = [
      'Hola MATRIA, quiero realizar este pedido:',
      '',
      ...lines,
      '',
      `Subtotal: ${formatCurrency(subtotal)}`,
      `Descuento: ${formatCurrency(discount)}`,
      `Total: ${formatCurrency(total)}`,
      '',
      'Quedo atenta para coordinar pago y entrega. Gracias.'
    ].join('\n');

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  function handleProductSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const format = document.getElementById('productFormat').value;
    const price = Number(document.getElementById('productPrice').value || 0);
    const discount = Number(document.getElementById('productDiscount').value || 0);
    const description = document.getElementById('productDescription').value.trim();
    const mediaText = document.getElementById('productMedia').value.trim();

    if (!name || !price) {
      alert('Completa al menos nombre y precio para crear el producto.');
      return;
    }

    const media = mediaText
      ? mediaText.split('\n').map(line => line.trim()).filter(Boolean).map(src => ({
          type: src.toLowerCase().endsWith('.mp4') || src.toLowerCase().includes('video') ? 'video' : 'image',
          src,
          alt: name
        }))
      : [];

    const customProducts = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
    customProducts.unshift({
      id: `custom-${Date.now()}`,
      name,
      category,
      format,
      price,
      discount,
      shortDescription: description.slice(0, 110) || 'Nuevo producto agregado desde el navegador.',
      description: description || 'Nuevo producto agregado desde el navegador.',
      features: ['Producto agregado manualmente', 'Editable a futuro', 'Preparado para ecommerce'],
      media,
      badge: 'Nuevo'
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(customProducts));
    state.products = [
      ...state.products.filter(product => !String(product.id).startsWith('custom-')),
      ...customProducts
    ];

    applyFilters();
    event.target.reset();
    alert('Producto agregado correctamente en este navegador.');
  }

  function currentPrice(product) {
    const discount = Number(product.discount || 0);
    return Number((product.price * (1 - discount / 100)).toFixed(2));
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function persistCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  }

  function loadCart() {
    return safeJsonParse(localStorage.getItem(CART_KEY), []);
  }

  function openCart() {
    elements.cartDrawer.classList.add('is-open');
    elements.cartDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeCart() {
    elements.cartDrawer.classList.remove('is-open');
    elements.cartDrawer.setAttribute('aria-hidden', 'true');
  }

  function safeJsonParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function escapeHtml(text) {
    return String(text)
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
})();
