const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

// node-fetch compatible import for all Node versions
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
// Render uses process.env.PORT
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
    whatsappNumber: '8801700000000',
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

// --- FIXED TELEGRAM LOGIC WITH ASYNC ---
const sendTelegramNotification = async (order) => {
  try {
    const settings = db.get('settings').value();
    const token = settings?.telegramBotToken;
    const chatId = settings?.telegramChatId;

    if (!token || !chatId) return;

    const itemsList = order.items.map(i => {
      const qty = i.quantity || 1;
      return `• ${i.name} ${qty > 1 ? `(x${qty})` : ''} - ৳${i.price}`;
    }).join('\n');

    const message = `
📦 *New Order Received!*
--------------------------------
*Order ID:* #${order.id.slice(-4)}
👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.customerPhone || 'N/A'}
📍 *Address:* ${order.customerAddress || 'N/A'}

🛒 *Items:*
${itemsList}

💰 *Total Amount:* ৳${order.total}
--------------------------------`.trim();

    // 1. Send Main Text Message
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    });

    if (response.ok) {
      console.log('[Telegram] Message sent successfully');
    }

    // 2. Send Photos
    for (const item of order.items) {
      if (item.image) {
        try {
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('caption', `Item: ${item.name}`);

          if (item.image.startsWith('http')) {
            formData.append('photo', item.image);
          } else {
            const rawPath = item.image.startsWith('/') ? item.image.slice(1) : item.image;
            const filePath = path.join(__dirname, decodeURIComponent(rawPath));
            if (fs.existsSync(filePath)) {
              formData.append('photo', fs.createReadStream(filePath));
            } else {
              continue;
            }
          }
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: formData });
        } catch (imgErr) {
          console.error(`[Telegram] Image error:`, imgErr.message);
        }
      }
    }
  } catch (e) {
    console.error("[Telegram] Fatal Error:", e.message);
  }
};

// --- ROUTES ---

app.get('/', (req, res) => res.send('API is running...'));

app.get('/api/products', (req, res) => res.json(db.get('products').value()));

app.get('/api/orders', (req, res) => res.json(db.get('orders').value()));

app.get('/api/analytics', (req, res) => {
  const orders = db.get('orders').value() || [];
  res.json({ totalOrders: orders.length });
});

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
  console.log(`[Order] New order: #${order.id.slice(-4)}`);
  
  sendTelegramNotification(order); // Non-blocking call
  res.json(order);
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const savedPassword = db.get('settings.adminPassword').value();
  res.json({ success: password === savedPassword });
});

app.get('/api/settings', (req, res) => res.json(db.get('settings').value()));

app.post('/api/settings', (req, res) => {
  db.get('settings').assign(req.body).write();
  res.json({ success: true });
});

app.post('/api/products', upload.single('image'), (req, res) => {
  const product = { 
    ...req.body, 
    id: Date.now().toString(),
    price: Number(req.body.price),
    image: req.file ? `/uploads/${req.file.filename}` : '',
    createdAt: new Date().toISOString()
  };
  db.get('products').push(product).write();
  res.json({ success: true, product });
});

app.delete('/api/products/:id', (req, res) => {
  db.get('products').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
