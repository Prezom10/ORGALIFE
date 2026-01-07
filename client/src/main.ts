import './style.css'

const API_URL = 'https://orgalife-server.onrender.com/api';
const SERVER_URL = 'https://orgalife-server.onrender.com';

interface Product {
  id: string;
  name: string;
  price: number;
  wholesalePrice?: number;
  category: string;
  image: string;
  stock: number;
  description?: string;
  isInSlider?: boolean;
}

// State
let products: Product[] = [];
let validDiscounts: any[] = [];
let appliedDiscount = { code: '', percent: 0 };
let currentCategory = 'All';
let currentOrderItems: any[] = [];
let selectedCombo: Product[] = JSON.parse(localStorage.getItem('selectedCombo') || '[]');
const app = document.getElementById('app')!;

// --- HELPER: Resolve Image URL ---
function getImageUrl(path: string) {
  if (!path) return 'https://via.placeholder.com/300?text=No+Image';
  if (path.startsWith('http')) return path;
  return `${SERVER_URL}${path}`;
}

// --- DIRECT ORDER SYSTEM ---
(window as any).openOrderModal = (items: any[]) => {
  currentOrderItems = items;
  appliedDiscount = { code: '', percent: 0 }; // Reset discount on new order
  const modal = document.getElementById('order-modal');
  if (modal) {
    modal.style.display = 'flex';
    renderOrderSummary();
  }
};

(window as any).closeModal = () => {
  const modal = document.getElementById('order-modal');
  if (modal) modal.style.display = 'none';
};

function calculateTotal() {
  const subtotal = currentOrderItems.reduce((acc, i) => acc + i.price, 0);
  const discountAmount = Math.round(subtotal * (appliedDiscount.percent / 100));
  return subtotal - discountAmount;
}

(window as any).applyDiscount = () => {
  const codeInput = document.getElementById('promo-code') as HTMLInputElement;
  const code = codeInput.value.trim().toUpperCase();

  const valid = validDiscounts.find(d => d.code.toUpperCase() === code);
  if (valid) {
    appliedDiscount = { code: valid.code, percent: valid.percent };
    alert(`Success! ${valid.percent}% Discount Applied.`);
    renderOrderSummary();
  } else {
    alert("Invalid or Expired Code");
    appliedDiscount = { code: '', percent: 0 };
    renderOrderSummary();
  }
};

function renderOrderSummary() {
  const list = document.getElementById('order-summary-list');
  const totalEl = document.getElementById('order-total-price');
  if (!list || !totalEl) return;

  let subtotal = 0;
  const itemsHtml = currentOrderItems.map(item => {
    subtotal += item.price;
    return `<div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                  <span>${item.name}</span>
                  <span>৳${item.price}</span>
            </div>`;
  }).join('');

  const discountAmount = Math.round(subtotal * (appliedDiscount.percent / 100));
  const finalTotal = subtotal - discountAmount;

  list.innerHTML = `
    ${itemsHtml}
    ${appliedDiscount.percent > 0 ? `
        <div style="display:flex; justify-content:space-between; color:green; margin-top:10px; border-top:1px dashed #ddd; padding-top:5px;">
            <span>Discount (${appliedDiscount.code})</span>
            <span>-৳${discountAmount}</span>
        </div>
    ` : ''}
  `;
  totalEl.innerText = `৳${finalTotal}`;
}

(window as any).submitDirectOrder = async () => {
  const nameEl = document.getElementById('direct-name') as HTMLInputElement;
  const phoneEl = document.getElementById('direct-phone') as HTMLInputElement;
  const addressEl = document.getElementById('direct-address') as HTMLTextAreaElement;
  const errorEl = document.getElementById('order-error');

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const address = addressEl.value.trim();

  if (!name || !phone || !address) {
    if (errorEl) {
      errorEl.innerText = "Please fill in all fields (Name, Phone, Address).";
      errorEl.style.display = 'block';
    } else {
      alert("All fields are required!");
    }
    return;
  }

  const finalTotal = calculateTotal();

  const order = {
    customerName: name,
    customerPhone: phone,
    customerAddress: address,
    items: currentOrderItems,
    total: finalTotal,
    discountCode: appliedDiscount.code || null
  };

  try {
    const formData = new FormData();
    formData.append('orderData', JSON.stringify(order));

    const res = await fetch(`${API_URL}/orders`, { method: 'POST', body: formData });
    const savedOrder = await res.json();
    (window as any).closeModal();
    renderOrderSuccess(savedOrder);
  } catch (e) {
    alert("Network Error!");
  }
};

function renderOrderSuccess(order: any) {
  app.innerHTML = `
    <div class="container" style="padding:100px 20px; text-align:center;">
        <div class="glass" style="max-width:600px; margin:0 auto; padding:40px; border-radius:20px;">
            <div style="font-size:4rem; margin-bottom:20px;">🎉</div>
            <h1 style="color:var(--primary); margin-bottom:10px;">Order Placed Successfully!</h1>
            <p style="color:#666; font-size:1.1rem; margin-bottom:30px;">Thank you, ${order.customerName}. Your order has been received.</p>
            
            <div style="background:#f9f9f9; padding:20px; border-radius:10px; text-align:left; margin-bottom:30px;">
                <p><strong>Order ID:</strong> #${order.id.slice(-4)}</p>
                <p><strong>Phone:</strong> ${order.customerPhone}</p>
                <p><strong>Address:</strong> ${order.customerAddress}</p>
                <hr style="margin:15px 0; border:0; border-top:1px dashed #ddd;">
                <h4 style="margin-bottom:10px;">Items:</h4>
                <ul style="list-style:none; padding:0;">
                    ${order.items.map((i: any) => `
                        <li style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span>${i.name}</span>
                            <span>৳${i.price}</span>
                        </li>
                    `).join('')}
                </ul>
                <hr style="margin:15px 0; border:0; border-top:1px solid #ddd;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;">
                    <span>Total Paid:</span>
                    <span>৳${order.total}</span>
                </div>
            </div>

            <button class="btn btn-primary" onclick="location.reload()">Continue Shopping</button>
        </div>
    </div>
  `;
}

// --- CORE APP ---

fetchProducts();

async function fetchProducts() {
  try {
    const [pRes, sRes] = await Promise.all([
      fetch(`${API_URL}/products`),
      fetch(`${API_URL}/settings`)
    ]);

    if (!pRes.ok) throw new Error(`HTTP Error`);
    products = await pRes.json();

    const settings = await sRes.json();
    if (settings.discounts) validDiscounts = settings.discounts;

    renderHome();
  } catch (err) {
    console.error("Fetch Failed:", err);
    app.innerHTML = `
        <div style="text-align:center; padding:100px;">
            <h2>⚠️ Connection Error</h2>
            <p>Could not load products. Check server.</p>
            <button class="btn btn-primary" onclick="location.reload()">Retry</button>
        </div>
    `;
  }
}

function renderHome(error = false) {
  const categories = [...new Set(products.map(p => p.category))];
  const displayedProducts = currentCategory === 'All' ? products : products.filter(p => p.category === currentCategory);
  const sliderProducts = products.filter(p => p.isInSlider);
  const activeSlides = sliderProducts.length > 0 ? sliderProducts : products.slice(0, 3);

  app.innerHTML = `
    ${renderOrderModalHTML()}

    <header class="glass">
      <div class="logo" onclick="location.reload()" style="cursor:pointer;">ORGALIFE</div>
      
       <!-- Search Bar -->
      <div class="search-bar">
          <input type="text" id="global-search" placeholder="Search..." onkeyup="handleSearch(this.value)">
      </div>

      <nav>
        <ul class="nav-links">
            <li><a href="#" id="home-link">Home</a></li>
            <li><a href="#" id="combo-link">Combo Builder</a></li>
        </ul>
        <div class="mobile-menu-icon" onclick="toggleMobileMenu()">☰</div>
      </nav>
    </header>
    
    <div id="mobile-menu" class="glass mobile-menu-hidden">
        <a href="#" onclick="toggleMobileMenu(); fetchProducts()">Home</a>
        <a href="#" onclick="toggleMobileMenu(); renderComboPage()">Combo Builder</a>
    </div>

    <section class="container" style="margin-top: 20px;">
        <div class="hero-slider" id="home-slider">
            ${activeSlides.map((p, idx) => `
                <div class="slide ${idx === 0 ? 'active' : ''}" style="background-image: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${getImageUrl(p.image)}');">
                    <div class="slide-content">
                        <h2>${p.name}</h2>
                        <p>Special Price: ৳${p.price}</p>
                        <button class="btn btn-primary" onclick="openOrderModal([{name: '${p.name}', price: ${p.price}, id: '${p.id}'}])">Buy Now</button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="promo-banner">🎁 BUILD YOUR CUSTOM GIFT PACKAGE - SAVE MORE ON COMBO ORDERS! 🎁</div>
    </section>

    <div class="container" id="shop">
      <h2 style="text-align:center; margin-top:50px;">Featured Collections</h2>
      <div style="display:flex; justify-content:center; gap:10px; margin-bottom:30px; flex-wrap:wrap;">
        <button class="btn ${currentCategory === 'All' ? 'btn-primary' : 'btn-outline'}" onclick="setCategory('All')">All</button>
        ${categories.map(c => `<button class="btn ${currentCategory === c ? 'btn-primary' : 'btn-outline'}" onclick="setCategory('${c}')">${c}</button>`).join('')}
      </div>
      <div class="product-grid">
        ${displayedProducts.map(p => `
          <div class="product-card glass">
            <img src="${getImageUrl(p.image)}" class="product-image" onclick="viewProduct('${p.id}')" style="cursor:pointer;">
            <div class="product-info">
              <span class="product-category">${p.category}</span>
              <h3 onclick="viewProduct('${p.id}')" style="cursor:pointer;">${p.name}</h3>
              <p class="product-price">৳${p.price}</p>
              <div style="display:flex; gap:10px; margin-top:15px;">
                  <button class="btn btn-outline" style="flex:1;" onclick="viewProduct('${p.id}')">View</button>
                  <button class="btn btn-primary" style="flex:1;" onclick="openOrderModal([{name: '${p.name}', price: ${p.price}, id: '${p.id}'}])">Buy Now</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <a href="https://wa.me/8801700000000" class="whatsapp-bubble" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"></a>
  `;

  setupEventListeners();
  checkHash();
  initSlider();
}

function renderOrderModalHTML() {
  return `
    <!-- ORDER MODAL -->
    <div id="order-modal" class="modal-overlay">
        <div class="modal-content">
            <h3>Complete Your Order</h3>
            <div style="background:#f9f9f9; padding:15px; margin-bottom:15px; border-radius:10px;">
                <h4>Order Summary</h4>
                <div id="order-summary-list"></div>
                
                <!-- PROMO INPUT -->
                <div style="display:flex; gap:5px; margin:10px 0;">
                    <input type="text" id="promo-code" placeholder="Promo Code" style="padding:5px; flex:1; border:1px solid #ddd; border-radius:5px;">
                    <button class="btn btn-outline" style="padding:5px 10px; font-size:0.8rem;" onclick="applyDiscount()">Apply</button>
                </div>

                <hr style="margin:10px 0;">
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span>Total:</span>
                    <span id="order-total-price">0</span>
                </div>
            </div>
            
            <div class="form-group"><label>Name *</label><input type="text" id="direct-name" placeholder="Your Name"></div>
            <div class="form-group"><label>Phone *</label><input type="text" id="direct-phone" placeholder="017xxxxxxxx"></div>
            <div class="form-group"><label>Address *</label><textarea id="direct-address" placeholder="Delivery Address"></textarea></div>
            
            <p id="order-error" style="color:red; display:none; text-align:center; font-weight:bold;"></p>

            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn btn-primary" style="flex:1;" onclick="submitDirectOrder()">Confirm Order</button>
                <button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Cancel</button>
            </div>
        </div>
    </div>`;
}

// Global search handler
(window as any).handleSearch = (query: string) => {
  if (!query) {
    renderHome();
    return;
  }
  const lower = query.toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower));

  // Manually update grid
  const grid = document.querySelector('.product-grid');
  if (grid) {
    grid.innerHTML = filtered.map(p => `
          <div class="product-card glass">
            <img src="${getImageUrl(p.image)}" class="product-image" onclick="viewProduct('${p.id}')" style="cursor:pointer;">
            <div class="product-info">
              <span class="product-category">${p.category}</span>
              <h3 onclick="viewProduct('${p.id}')" style="cursor:pointer;">${p.name}</h3>
              <p class="product-price">৳${p.price}</p>
              <div style="display:flex; gap:10px; margin-top:15px;">
                  <button class="btn btn-outline" style="flex:1;" onclick="viewProduct('${p.id}')">View</button>
                  <button class="btn btn-primary" style="flex:1;" onclick="openOrderModal([{name: '${p.name}', price: ${p.price}, id: '${p.id}'}])">Buy Now</button>
              </div>
            </div>
          </div>
        `).join('') || '<p style="grid-column:1/-1; text-align:center;">No match found.</p>';
  }
};

(window as any).toggleMobileMenu = () => {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('mobile-menu-hidden');
};


function initSlider() {
  const slides = document.querySelectorAll('.slide');
  let current = 0;
  if (slides.length > 0) {
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 4000);
  }
}

function checkHash() { if (window.location.hash === '#/admin-prezom') renderAdminLogin(); }
window.addEventListener('hashchange', checkHash);

function setupEventListeners() {
  document.getElementById('home-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    fetchProducts();
  });
  document.getElementById('combo-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderComboPage();
  });
}


(window as any).setCategory = (c: string) => { currentCategory = c; renderHome(); };

(window as any).viewProduct = async (id: string) => {
  const p = products.find(x => x.id === id);
  if (!p) return;
  fetch(`${API_URL}/click/${id}`, { method: 'POST' });

  app.innerHTML = `
    ${renderOrderModalHTML()}

    <div class="container" style="padding:50px 0;">
      <button class="btn btn-outline" onclick="setCategory('All'); fetchProducts()" style="margin-bottom:20px;">&larr; Back to Shop</button>
      <div class="glass" style="display:flex; gap:40px; padding:40px; border-radius:20px; align-items:start; flex-wrap:wrap;">
        <img src="${getImageUrl(p.image)}" style="max-width:400px; width:100%; border-radius:10px;">
        <div style="flex:1;">
          <span class="product-category">${p.category}</span>
          <h1>${p.name}</h1>
          <p style="font-size:1.5rem; font-weight:bold;">৳${p.price}</p>
          <p style="margin-bottom:30px;">${p.description || 'Premium Product.'}</p>
          <button class="btn btn-primary" onclick="openOrderModal([{name: '${p.name}', price: ${p.price}, id: '${p.id}'}])">Buy Now</button>
        </div>
      </div>
    </div>
  `;
};


// --- COMBO BUILDER ---

function renderComboPage() {
  const categories = [...new Set(products.map(p => p.category))];

  app.innerHTML = `
      ${renderOrderModalHTML()}

      <header class="glass">
      <div class="logo" onclick="location.reload()" style="cursor:pointer;">ORGALIFE</div>
      
       <!-- Search Bar -->
      <div class="search-bar">
          <input type="text" id="global-search" placeholder="Search..." onkeyup="handleSearch(this.value)">
      </div>

      <nav>
        <ul class="nav-links">
            <li><a href="#" onclick="fetchProducts()">Home</a></li>
            <li><a href="#" class="active" style="color:var(--primary-dark);">Combo Builder</a></li>
        </ul>
        <div class="mobile-menu-icon" onclick="toggleMobileMenu()">☰</div>
      </nav>
    </header>
    
    <div id="mobile-menu" class="glass mobile-menu-hidden">
        <a href="#" onclick="toggleMobileMenu(); fetchProducts()">Home</a>
        <a href="#" onclick="toggleMobileMenu(); renderComboPage()">Combo Builder</a>
    </div>

    <div class="container combo-builder" style="padding-top: 20px;">
        <h2 style="text-align:center; margin-bottom:20px;">Build Your Custom Package</h2>
        <div class="combo-grid">
            <div class="category-list glass">
                <button class="category-btn active" onclick="filterComboProducts('All')">All Items</button>
                ${categories.map(c => `<button class="category-btn" onclick="filterComboProducts('${c}')">${c}</button>`).join('')}
            </div>
            <div class="combo-products glass" id="combo-product-list">
                ${products.map(p => `
                    <div class="combo-product-card" onclick="toggleComboItem('${p.id}')">
                        <img src="${getImageUrl(p.image)}">
                        <div style="font-size:0.9rem; font-weight:bold;">${p.name}</div>
                        <div style="font-size:0.8rem; color:#888;">৳${p.price}</div>
                    </div>
                `).join('')}
            </div>
            <div class="combo-selection">
                <h3 style="text-align:center;">Your Package</h3>
                <div id="combo-items-list" style="flex:1; overflow-y:auto; margin:10px 0;">
                    ${selectedCombo.length === 0 ? '<p style="text-align:center; margin-top:50px; color:#aaa;">Click items to add</p>' : ''}
                    ${selectedCombo.map((p, idx) => `
                        <div class="selected-item">
                            <span>${p.name}</span>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span>৳${p.price}</span>
                                <button onclick="removeFromCombo(${idx})" style="background:none; border:none; color:red; cursor:pointer;">&times;</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="border-top:1px solid #ddd; padding-top:10px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:10px;">
                        <span>Total:</span>
                        <span>৳${selectedCombo.reduce((a, b) => a + b.price, 0)}</span>
                    </div>
                    <button class="btn btn-primary" style="width:100%;" onclick="startComboOrder()">Checkout Combo</button>
                </div>
            </div>
        </div>
    </div>
  `;
}

(window as any).filterComboProducts = (cat: string) => {
  const list = document.getElementById('combo-product-list');
  if (!list) return;
  const filtered = cat === 'All' ? products : products.filter(p => p.category === cat);
  list.innerHTML = filtered.map(p => `
        <div class="combo-product-card" onclick="toggleComboItem('${p.id}')">
            <img src="${getImageUrl(p.image)}">
            <div style="font-size:0.9rem; font-weight:bold;">${p.name}</div>
            <div style="font-size:0.8rem; color:#888;">৳${p.price}</div>
        </div>
    `).join('');
};

(window as any).toggleComboItem = (id: string) => {
  const p = products.find(x => x.id === id);
  if (p) {
    selectedCombo.push(p);
    localStorage.setItem('selectedCombo', JSON.stringify(selectedCombo));
    renderComboPage();
  }
};

(window as any).removeFromCombo = (idx: number) => {
  selectedCombo.splice(idx, 1);
  localStorage.setItem('selectedCombo', JSON.stringify(selectedCombo));
  renderComboPage();
};

(window as any).startComboOrder = () => {
  if (selectedCombo.length === 0) return alert("Empty Box!");
  (window as any).openOrderModal(selectedCombo);
};

// --- ADMIN ---

function renderAdminLogin() {
  app.innerHTML = `
    <div class="admin-login glass fade-in">
      <h2>Admin Access</h2>
      <div class="form-group"><label>Password</label><input type="password" id="admin-pass"></div>
      <button class="btn btn-primary" style="width: 100%;" onclick="login()">Enter</button>
    </div>
  `;
}

(window as any).login = async () => {
  const p = (document.getElementById('admin-pass') as HTMLInputElement).value.trim();
  if (!p) return alert('Enter password');
  try {
    const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: p }) });
    const data = await res.json();
    if (data.success) renderAdminDashboard();
    else alert('Invalid Password');
  } catch (e) { alert('Connection Error'); }
};


async function renderAdminDashboard() {
  try {
    const [oRes, aRes, sRes] = await Promise.all([fetch(`${API_URL}/orders`), fetch(`${API_URL}/analytics`), fetch(`${API_URL}/settings`)]);
    const orders = await oRes.json();
    const analytics = await aRes.json();
    const settings = await sRes.json();

    if (products.length === 0) { const pRes = await fetch(`${API_URL}/products`); products = await pRes.json(); }

    const settingsHTML = renderStoreSettingsHTML(settings);

    app.innerHTML = `
        <div class="container" style="padding:50px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
            <h2>Admin Dashboard</h2>
            <button class="btn btn-outline" onclick="window.location.hash=''; location.reload();">Logout</button>
          </div>
          <div style="display:flex; gap:10px; margin-bottom:20px;">
            <button class="btn btn-primary" onclick="switchTab('orders')">Orders</button>
            <button class="btn btn-outline" onclick="switchTab('products')">Products</button>
            <button class="btn btn-outline" onclick="switchTab('settings')">Settings</button>
            <button class="btn btn-outline" onclick="switchTab('reports')">Reports</button>
          </div>
          
          <!-- ORDERS TAB -->
          <div id="tab-orders" class="glass" style="padding:30px; border-radius:20px;">
            <h3>Orders (${orders.length})</h3>
             <div style="margin-top:20px;">
                ${orders.map((o: any) => `
                  <div style="border:1px solid #e0e0e0; border-radius:10px; padding:20px; margin-bottom:20px; background:#fff;">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px; flex-wrap:wrap; gap:15px;">
                      <div style="flex:1; min-width:200px;">
                        <h4 style="margin:0 0 10px 0; color:var(--primary);">Order #${o.id.slice(-4)}</h4>
                        <p style="margin:5px 0;"><strong>👤 Customer:</strong> ${o.customerName || 'Guest'}</p>
                        <p style="margin:5px 0;"><strong>📞 Phone:</strong> ${o.customerPhone || 'N/A'}</p>
                        <p style="margin:5px 0;"><strong>📍 Address:</strong> ${o.customerAddress || 'N/A'}</p>
                        <p style="margin:5px 0;"><strong>📅 Date:</strong> ${new Date(o.createdAt).toLocaleString()}</p>
                      </div>
                      <div style="text-align:right;">
                        <div style="margin-bottom:10px;">
                          <span style="padding:5px 15px; border-radius:20px; font-size:0.9rem; font-weight:bold; background:${o.status === 'Pending' ? '#ffeeba' : o.status === 'Confirmed' ? '#d4edda' : '#f8d7da'}">
                            ${o.status}
                          </span>
                        </div>
                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                          <button class="btn-outline" style="color:green; padding:5px 10px;" title="Confirm" onclick="updateOrderStatus('${o.id}', 'Confirmed')">✔</button>
                          <button class="btn-outline" style="color:red; padding:5px 10px;" title="Cancel" onclick="updateOrderStatus('${o.id}', 'Cancelled')">✖</button>
                          <button class="btn-outline" style="padding:5px 10px;" onclick="generateInvoice('${o.id}')">🖨️</button>
                        </div>
                      </div>
                    </div>
                    
                    <div style="border-top:1px solid #e0e0e0; padding-top:15px;">
                      <h5 style="margin:0 0 10px 0;">🛒 Ordered Items:</h5>
                      <div style="display:grid; gap:10px;">
                        ${(o.items || []).map((item: any) => `
                          <div style="display:flex; align-items:center; gap:15px; padding:10px; background:#f9f9f9; border-radius:8px;">
                            <img src="${getImageUrl(item.image || '')}" 
                                 style="width:60px; height:60px; object-fit:cover; border-radius:5px; background:#e0e0e0;" 
                                 onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
                            <div style="flex:1;">
                              <div style="font-weight:bold; margin-bottom:3px;">${item.name || 'Unknown Item'}</div>
                              <div style="font-size:0.85rem; color:#666;">
                                ${item.quantity ? `Quantity: ${item.quantity} × ` : ''}৳${item.price || 0}
                              </div>
                            </div>
                            <div style="font-weight:bold; color:var(--primary);">
                              ৳${(item.quantity || 1) * (item.price || 0)}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                      <div style="text-align:right; margin-top:15px; padding-top:10px; border-top:1px dashed #ddd;">
                        <strong style="font-size:1.2rem;">💰 Total: ৳${o.total || 0}</strong>
                      </div>
                    </div>
                  </div>
                `).join('')}
             </div>
          </div>

          <!-- PRODUCTS TAB -->
          <div id="tab-products" class="glass" style="padding:30px; border-radius:20px; display:none;">
             <button class="btn btn-primary" onclick="showAddProduct()">+ Add Product</button>
             <div style="margin-top:20px;">
                ${products.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding:5px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${getImageUrl(p.image)}" style="width:40px; height:40px; object-fit:cover;"> 
                            <div>
                                <strong>${p.name}</strong><br>
                                <small>৳${p.price} | Stock: ${p.stock}</small>
                            </div>
                        </div>
                        <div>
                            <button class="btn-outline" onclick="showEditProduct('${p.id}')">Edit</button>
                            <button class="btn-outline" onclick="deleteProduct('${p.id}')" style="color:red; border-color:red;">Del</button>
                        </div>
                    </div>
                `).join('')}
             </div>
          </div>
          
          ${settingsHTML}
          
          <!-- REPORTS TAB -->
          <div id="tab-reports" class="glass" style="padding:30px; border-radius:20px; display:none;">
            <h3>Analytics</h3>
            <p><strong>Total Orders:</strong> ${analytics.totalOrders}</p>
            <p><strong>Returning Customers:</strong> ${analytics.returningCustomers || 'N/A'}</p>
          </div>
        </div>
      `;
  } catch (e) { alert('Error loading Admin'); }
}

(window as any).updateOrderStatus = async (id: string, status: string) => {
  if (!confirm(`Mark order as ${status}?`)) return;
  try {
    await fetch(`${API_URL}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    renderAdminDashboard(); // Refresh
  } catch (e) { alert("Failed to update status"); }
};

(window as any).showEditProduct = (id: string) => {
  const p = products.find(x => x.id === id);
  if (!p) return;

  // Reuse Add Modal but populate it
  showAddProduct();

  setTimeout(() => {
    (document.getElementById('modal-title') as HTMLElement).innerText = "Edit Product";
    (document.getElementById('edit-id') as HTMLInputElement).value = id;
    (document.getElementById('p-name') as HTMLInputElement).value = p.name;
    (document.getElementById('p-price') as HTMLInputElement).value = String(p.price);
    (document.getElementById('p-category') as HTMLInputElement).value = p.category;
    (document.getElementById('p-slider') as HTMLInputElement).checked = !!p.isInSlider;
  }, 100);
};

// ... existing showAddProduct ...
(window as any).showAddProduct = () => {
  const h = `
  <div id="admin-product-modal" class="modal-overlay" style="display:flex;">
    <div class="modal-content">
      <h3 id="modal-title">Add Product</h3>
      <input type="hidden" id="edit-id">
      <div class="form-group"><label>Name</label><input type="text" id="p-name"></div>
      <div class="form-group"><label>Price</label><input type="number" id="p-price"></div>
      <div class="form-group"><label>Category</label><input type="text" id="p-category"></div>
      <div class="form-group"><label>Image</label><input type="file" id="p-file"></div>
      <div class="form-group"><input type="checkbox" id="p-slider"> Show in Slider</div>
      <button class="btn btn-primary" onclick="submitProductForm()">Save</button>
      <button class="btn btn-outline" onclick="document.getElementById('admin-product-modal').remove()">Cancel</button>
    </div>
  </div>`;
  const d = document.createElement('div'); d.innerHTML = h; document.body.appendChild(d.firstElementChild!);
};

(window as any).submitProductForm = async () => {
  const id = (document.getElementById('edit-id') as HTMLInputElement).value;
  const name = (document.getElementById('p-name') as HTMLInputElement).value;
  const price = (document.getElementById('p-price') as HTMLInputElement).value;
  const cat = (document.getElementById('p-category') as HTMLInputElement).value;
  const file = (document.getElementById('p-file') as HTMLInputElement).files?.[0];
  const slider = (document.getElementById('p-slider') as HTMLInputElement).checked;

  const fd = new FormData();
  fd.append('name', name); fd.append('price', price); fd.append('category', cat); fd.append('isInSlider', String(slider));
  if (file) fd.append('image', file);

  const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
  const method = id ? 'PUT' : 'POST';

  await fetch(url, { method: method, body: fd });
  alert('Saved'); loadingAdminDashboard(); // Use renderAdminDashboard logic
  location.reload(); // Simple reload for now
};



function renderStoreSettingsHTML(s: any) {
  if (!s.discounts) s.discounts = [];
  return `
    <div id="tab-settings" class="glass" style="padding:30px; border-radius:20px; display:none;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>
               <h4>Comms</h4>
               <div class="form-group"><label>WhatsApp</label><input type="text" id="set-wa" value="${s.whatsappNumber || ''}"></div>
               <div class="form-group"><label>Telegram Bot Token</label><input type="text" id="set-tg-token" value="${s.telegramBotToken || ''}"></div>
               <div class="form-group"><label>Telegram Chat ID</label><input type="text" id="set-tg-chat" value="${s.telegramChatId || ''}"></div>
               <button class="btn btn-primary" onclick="saveCoreSettings()">Save</button>
            </div>
            <div>
                <h4>Discounts</h4>
                <div style="display:flex; gap:5px; margin-bottom:10px;"><input type="text" id="disc-code" placeholder="Code"><input type="number" id="disc-percent" placeholder="%"><button onclick="addDiscount()">Add</button></div>
                <!-- Updated: added max-height, overflow-y, and ensured flex list is constrained -->
                <ul id="settings-discount-list" style="max-height:300px; overflow-y:auto; padding-right:5px;">
                  ${s.discounts.map((d: any) => `
                    <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:rgba(255,255,255,0.5); padding:5px 10px; border-radius:5px;">
                        <span><strong>${d.code}</strong>: ${d.percent}%</span>
                        <button onclick="removeDiscount('${d.code}')" style="background:none; border:none; color:red; cursor:pointer; font-size:1.2rem; font-weight:bold;">&times;</button>
                    </li>
                  `).join('')}
                </ul>
            </div>
        </div>
      </div>
    `;
}

(window as any).switchTab = (t: string) => { ['orders', 'products', 'settings', 'reports'].forEach(x => { const el = document.getElementById('tab-' + x); if (el) el.style.display = x === t ? 'block' : 'none'; }); };
(window as any).saveCoreSettings = async () => { /* ... impl ... */ };
// Note: Keeping existing robust implementations for admin actions (saveCoreSettings, addDiscount, showAddProduct...) 
// Since this is a rewrite, I'll allow the previously defined global functions to persist or re-define them if needed. 
// For brevity and limits, assuming Admin CRUD logic remains similar to previous step.
// Re-injecting essential Admin CRUD:

(window as any).showAddProduct = () => {
  const h = `
  <div id="admin-product-modal" class="modal-overlay" style="display:flex;">
    <div class="modal-content">
      <h3>Add Product</h3>
      <input type="hidden" id="edit-id">
      <div class="form-group"><input type="text" id="p-name" placeholder="Name"></div>
      <div class="form-group"><input type="number" id="p-price" placeholder="Price"></div>
      <div class="form-group"><input type="text" id="p-category" placeholder="Category" list="clist"><datalist id="clist"></datalist></div>
      <div class="form-group"><input type="file" id="p-file"></div>
      <div class="form-group"><input type="checkbox" id="p-slider"> Show in Slider</div>
      <button class="btn btn-primary" onclick="submitProductForm()">Save</button>
      <button class="btn btn-outline" onclick="document.getElementById('admin-product-modal').remove()">Cancel</button>
    </div>
  </div>`;
  const d = document.createElement('div'); d.innerHTML = h; document.body.appendChild(d.firstElementChild!);
};

(window as any).submitProductForm = async () => {
  const id = (document.getElementById('edit-id') as HTMLInputElement).value;
  const name = (document.getElementById('p-name') as HTMLInputElement).value;
  const price = (document.getElementById('p-price') as HTMLInputElement).value;
  const cat = (document.getElementById('p-category') as HTMLInputElement).value;
  const file = (document.getElementById('p-file') as HTMLInputElement).files?.[0];
  const slider = (document.getElementById('p-slider') as HTMLInputElement).checked;

  const fd = new FormData();
  fd.append('name', name);
  fd.append('price', price);
  fd.append('category', cat);
  fd.append('isInSlider', String(slider));
  if (file) fd.append('image', file);

  const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
  const method = id ? 'PUT' : 'POST';

  await fetch(url, { method, body: fd });
  alert('Saved');
  location.reload();
};

(window as any).deleteProduct = async (id: string) => {
  if (confirm('Delete this product?')) {
    await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    location.reload();
  }
};

(window as any).generateInvoice = async (id: string) => {
  const orders = await (await fetch(`${API_URL}/orders`)).json();
  const order = orders.find((o: any) => o.id === id);
  if (!order) return alert('Order not found');

  const win = window.open('', '_blank');
  if (!win) return alert('Please allow popups');

  win.document.write(`
    <html>
      <head>
        <title>Invoice #${order.id.slice(-4)}</title>
        <style>
          body { font-family: Arial; padding: 40px; }
          h1 { color: #F8C8DC; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #F8C8DC; }
        </style>
      </head>
      <body>
        <h1>ORGALIFE Invoice</h1>
        <p><strong>Order ID:</strong> #${order.id.slice(-4)}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${order.customerName}</p>
        <p><strong>Phone:</strong> ${order.customerPhone}</p>
        <p><strong>Address:</strong> ${order.customerAddress}</p>
        <h3>Items:</h3>
        <table>
          <tr><th>Item</th><th>Price</th></tr>
          ${order.items.map((i: any) => `<tr><td>${i.name}</td><td>৳${i.price}</td></tr>`).join('')}
          <tr><th>Total</th><th>৳${order.total}</th></tr>
        </table>
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print</button>
      </body>
    </html>
  `);
};

(window as any).saveCoreSettings = async () => {
  const wa = (document.getElementById('set-wa') as HTMLInputElement).value;
  const tgToken = (document.getElementById('set-tg-token') as HTMLInputElement).value;
  const tgChat = (document.getElementById('set-tg-chat') as HTMLInputElement).value;

  await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      whatsappNumber: wa,
      telegramBotToken: tgToken,
      telegramChatId: tgChat
    })
  });
  alert('Saved');
};

// Helper to refresh settings without reload
(window as any).refreshSettings = async () => {
  const sRes = await fetch(`${API_URL}/settings`);
  const s = await sRes.json();
  const list = document.getElementById('settings-discount-list');
  if (list && s.discounts) {
    list.innerHTML = s.discounts.map((d: any) => `
            <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:rgba(255,255,255,0.5); padding:5px 10px; border-radius:5px;">
                <span><strong>${d.code}</strong>: ${d.percent}%</span>
                <button onclick="removeDiscount('${d.code}')" style="background:none; border:none; color:red; cursor:pointer; font-size:1.2rem; font-weight:bold;">&times;</button>
            </li>
        `).join('');
  }
};

(window as any).addDiscount = async () => {
  const c = (document.getElementById('disc-code') as HTMLInputElement).value;
  const p = (document.getElementById('disc-percent') as HTMLInputElement).value;
  const res = await fetch(`${API_URL}/settings/discounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c, percent: p }) });
  if (res.ok) {
    alert('Added');
    (document.getElementById('disc-code') as HTMLInputElement).value = '';
    (document.getElementById('disc-percent') as HTMLInputElement).value = '';
    (window as any).refreshSettings(); // No reload
  } else {
    const d = await res.json();
    alert(d.message || 'Error Adding Discount');
  }
};

(window as any).removeDiscount = async (code: string) => {
  if (confirm(`Remove discount code ${code}?`)) {
    // Encoded to handle spaces
    await fetch(`${API_URL}/settings/discounts/${encodeURIComponent(code)}`, { method: 'DELETE' });
    (window as any).refreshSettings(); // No reload
  }
};

(window as any).toggleMobileMenu = () => {
  const menu = document.getElementById('mobile-menu');
  if (menu) {
    if (menu.classList.contains('mobile-menu-hidden')) {
      menu.classList.remove('mobile-menu-hidden');
    } else {
      menu.classList.add('mobile-menu-hidden');
    }
  }
};

function showAddProduct() {
  throw new Error('Function not implemented.');
}

function loadingAdminDashboard() {
  throw new Error('Function not implemented.');
}

