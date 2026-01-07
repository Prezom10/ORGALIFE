const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const https = require('https'); // fetch এর বদলে safe method

const app = express();
// Render-এর জন্য PORT সেটিংস
const PORT = process.env.PORT || 5000;

// Database setup
const adapter = new FileSync('db.json');
const db = low(adapter);

// Initial database state
db.defaults({
  products: [],
  orders: [],
  creditOrders: [],
  reviews: [],
  analytics: { productClicks: {} },
  settings: {
    adminPassword: 'admin',
    telegramBotToken: '8210984723:AAHJ2gh2ha6orqbExxk5as4DhJagYBcFS9k',
    telegramChatId: '5320621404',
    whatsappNumber: '8801305010956',
    discounts: []
  }
}).write();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// --- FIXED TELEGRAM LOGIC (Native HTTPS - No Fetch Needed) ---
const sendTelegramNotification = (order) => {
  try {
    const settings = db.get('settings').value();
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;

    if (!token || !chatId) return;

    const itemsList = order.items.map(i => {
      const qty = i.quantity || 1;
      return `• ${i.name} ${qty > 1 ? `(x${qty})` : ''} - BDT ${i.price}`;
    }).join('\n');

    const message = `
📦 *New Order Received!*
--------------------------------
*Order ID:* #${order.id.slice(-4)}
👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.customerPhone}
📍 *Address:* ${order.customerAddress}

🛒 *Items:*
${itemsList}

💰 *Total:* BDT ${order.total}
--------------------------------`.trim();

    // Send using Native HTTPS (Fixes "fetch is not a function")
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=Markdown`;
    
    https.get(url, (res) => {
      console.log('[Telegram] Notification sent. Status:', res.statusCode);
    }).on('error', (e) => {
      console.error('[Telegram] Error:', e.message);
    });

  } catch (e) {
    console.error("[Telegram] Fatal Error:", e.message);
  }
};

// --- ROUTES ---

app.get('/', (req, res) => res.send('Orgalife API is Running...'));

app.get('/api/products', (req, res) => res.json(db.get('products').value()));

app.get('/api/orders', (req, res) => res.json(db.get('orders').value()));

app.post('/api/orders', upload.any(), (req, res) => {
  let mergedData = req.body;
  if (req.body.orderData) {
    try { mergedData = JSON.parse(req.body.orderData); } catch (e) {}
  }

  const allProducts = db.get('products').value();
  let items = (mergedData.items || mergedData.cartItems || []).map(item => {
    const p = allProducts.find(prod => prod.id === item.id);
    return p ? { ...p, quantity: item.quantity || 1 } : item;
  });

  const order = {
    id: Date.now().toString(),
    customerName: mergedData.customerName || 'Guest',
    customerPhone: mergedData.customerPhone || 'N/A',
    customerAddress: mergedData.customerAddress || 'N/A',
    total: mergedData.total || 0,
    items: items,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  db.get('orders').push(order).write();
  console.log(`[Order] Success: #${order.id.slice(-4)}`);
  
  sendTelegramNotification(order);
  res.json(order);
});

// Admin Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const saved = db.get('settings.adminPassword').value();
  res.json({ success: password === saved });
});

// Settings
app.get('/api/settings', (req, res) => res.json(db.get('settings').value()));
app.post('/api/settings', (req, res) => {
  db.get('settings').assign(req.body).write();
  res.json({ success: true });
});

// Products Management
app.post('/api/products', upload.single('image'), (req, res) => {
  const product = { 
    ...req.body, 
    id: Date.now().toString(),
    price: Number(req.body.price),
    image: req.file ? `/uploads/${req.file.filename}` : '' 
  };
  db.get('products').push(product).write();
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  db.get('products').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
