const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const app = express();
const PORT = 5000;

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

// Telegram Notification Logic
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

👤 *Customer Name:* ${order.customerName}
📞 *Phone:* ${order.customerPhone || 'N/A'}
📍 *Address:* ${order.customerAddress || 'N/A'}

🛒 *Items:*
${itemsList}

💰 *Total Amount:* ৳${order.total}
--------------------------------
`.trim();

    // 1. Send Main Text Message
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    });

    if (response.ok) {
      console.log('[Telegram] Message sent successfully');
    } else {
      const errorData = await response.text();
      console.error('[Telegram] Failed to send message:', response.status, errorData);
    }

    // 2. Send Photos (if any item has an image)
    for (const item of order.items) {
      if (item.image) {
        try {
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('caption', `Item: ${item.name}`);

          if (item.image.startsWith('http')) {
            // Remote URL
            formData.append('photo', item.image);
          } else {
            // Local File
            // Remove leading slash if present (e.g. /uploads/foo.jpg -> uploads/foo.jpg)
            const rawPath = item.image.startsWith('/') ? item.image.slice(1) : item.image;
            // Decode URI components (e.g. "Screenshot%202026.jpg" -> "Screenshot 2026.jpg")
            const relativePath = decodeURIComponent(rawPath);
            const filePath = path.join(__dirname, relativePath);
            if (fs.existsSync(filePath)) {
              formData.append('photo', fs.createReadStream(filePath));
            } else {
              continue;
            }
          }

          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            body: formData
            // node-fetch with form-data automatically sets headers (Content-Type: multipart/form-data)
          });
        } catch (imgErr) {
          console.error(`[Telegram] Failed to send image for ${item.name}:`, imgErr.message);
        }
      }
    }

  } catch (e) {
    console.error("[Telegram] Error:", e.message);
  }
};

// Routes

app.get('/api/products', (req, res) => {
  const products = db.get('products').value();
  res.json(products);
});

app.get('/api/orders', (req, res) => {
  const orders = db.get('orders').value();
  res.json(orders);
});

app.get('/api/analytics', (req, res) => {
  const orders = db.get('orders').value();
  const totalOrders = orders.length;
  res.json({ totalOrders });
});

// Analytics: Retention & Sales
app.get('/api/analytics/retention', (req, res) => {
  const orders = db.get('orders').value();
  const customerCounts = orders.reduce((acc, order) => {
    const phone = order.customerPhone || 'unknown';
    acc[phone] = (acc[phone] || 0) + 1;
    return acc;
  }, {});

  const returning = Object.values(customerCounts).filter(count => count > 1).length;
  res.json({ returningCustomers: returning, totalCustomers: Object.keys(customerCounts).length });
});

app.get('/api/analytics/sales', (req, res) => {
  const orders = db.get('orders').value();
  const salesByDay = orders.reduce((acc, order) => {
    const date = order.createdAt.split('T')[0];
    acc[date] = (acc[date] || 0) + (order.total || 0);
    return acc;
  }, {});

  // Convert to array for chart
  const labels = Object.keys(salesByDay).slice(-7); // Last 7 days
  const data = labels.map(date => salesByDay[date]);

  res.json({ labels, data });
});

app.post('/api/click/:id', (req, res) => {
  const { id } = req.params;
  const clicks = db.get(`analytics.productClicks.${id}`).value() || 0;
  db.set(`analytics.productClicks.${id}`, clicks + 1).write();
  res.json({ success: true });
});

app.post('/api/orders', upload.any(), (req, res) => {
  let mergedData = {};

  if (req.body) Object.assign(mergedData, req.body);
  if (req.body.orderData) {
    try {
      const parsed = JSON.parse(req.body.orderData);
      Object.assign(mergedData, parsed);
    } catch (e) {
      // Silent fail for malformed data
    }
  }

  const photoFile = req.files ? req.files.find(f => f.fieldname === 'photo') : null;

  // Enrich items with full product details from database
  let items = mergedData.items || mergedData.cartItems || [];
  const allProducts = db.get('products').value();

  // Enrich each item with complete product info (especially image)
  items = items.map(item => {
    const productInDb = allProducts.find(p => p.id === item.id);
    if (productInDb) {
      // Merge database product info with order item, preserving any quantity
      return {
        id: productInDb.id,
        name: productInDb.name,
        price: item.price || productInDb.price,
        image: productInDb.image, // Save the image URL
        category: productInDb.category,
        description: productInDb.description,
        quantity: item.quantity || 1
      };
    }
    // If product not found in DB, use what we have
    return {
      ...item,
      quantity: item.quantity || 1
    };
  });

  const order = {
    id: Date.now().toString(),
    customerName: mergedData.customerName || mergedData.name || 'Guest',
    customerPhone: mergedData.customerPhone || mergedData.phone || 'N/A',
    customerAddress: mergedData.customerAddress || mergedData.address || 'N/A',
    total: mergedData.total || mergedData.totalAmount || 0,
    items: items,
    discountCode: mergedData.discountCode || null,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    photo: photoFile ? `/uploads/${photoFile.filename}` : (mergedData.photo || null)
  };

  db.get('orders').push(order).write();
  console.log(`[Order] New order created: #${order.id.slice(-4)} - ${order.customerName} - ৳${order.total}`);

  sendTelegramNotification(order);
  res.json(order);
});

app.patch('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  db.get('orders').find({ id }).assign(req.body).write();
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const savedPassword = db.get('settings.adminPassword').value();
  if (password && password.trim() === savedPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

app.post('/api/settings/password', (req, res) => {
  const { newPassword } = req.body;
  db.set('settings.adminPassword', newPassword).write();
  res.json({ success: true });
});

app.get('/api/settings', (req, res) => {
  const s = db.get('settings').value();
  if (!s.discounts) s.discounts = [];
  res.json(s);
});

app.post('/api/settings', (req, res) => {
  db.get('settings').assign(req.body).write();
  res.json({ success: true });
});

app.post('/api/settings/discounts', (req, res) => {
  const { code, percent } = req.body;
  if (!db.has('settings.discounts').value()) db.set('settings.discounts', []).write();

  // Check for duplicate
  const exists = db.get('settings.discounts').find({ code }).value();
  if (exists) return res.status(400).json({ success: false, message: 'Code exists' });

  db.get('settings.discounts').push({ code, percent: Number(percent) }).write();
  res.json({ success: true });
});

app.delete('/api/settings/discounts/:code', (req, res) => {
  const { code } = req.params;
  db.get('settings.discounts').remove({ code }).write();
  res.json({ success: true });
});

app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, price, category, stock, description, isInSlider, wholesalePrice } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : '';

  const product = {
    id: Date.now().toString(),
    name,
    price: Number(price),
    wholesalePrice: Number(wholesalePrice) || 0,
    category,
    image,
    stock: Number(stock),
    description,
    isInSlider: isInSlider === 'true',
    createdAt: new Date().toISOString()
  };

  db.get('products').push(product).write();
  res.json({ success: true, product });
});

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  if (updates.price) updates.price = Number(updates.price);
  if (updates.stock) updates.stock = Number(updates.stock);
  if (updates.wholesalePrice) updates.wholesalePrice = Number(updates.wholesalePrice);
  if (updates.isInSlider) updates.isInSlider = updates.isInSlider === 'true';

  if (req.file) {
    updates.image = `/uploads/${req.file.filename}`;
  }

  db.get('products').find({ id }).assign(updates).write();
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.get('products').remove({ id }).write();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
