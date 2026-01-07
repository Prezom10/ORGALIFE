# 🚀 Orgalife - Quick Start Guide

## Production-Ready E-commerce Platform

---

## ⚡ Quick Start (Development)

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Start Development Servers

**Terminal 1 - Backend Server:**
```bash
cd server
npm start
```
Server will run at: `http://localhost:5000`

**Terminal 2 - Frontend Client:**
```bash
cd client
npm run dev
```
Client will run at: `http://localhost:5173`

### 3. Access the Application

- **Website:** http://localhost:5173
- **Admin Panel:** http://localhost:5173/#/admin-prezom
- **Admin Password:** `prezom` (change in production!)

---

## 🏗️ Build for Production

### Create Production Build

```bash
cd client
npm run build:prod
```

Build output will be in `client/dist/` directory.

### Preview Production Build

```bash
cd client
npm run preview
```

---

## 📁 Project Structure

```
Orgalife/
├── client/                 # Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── main.ts        # Main application logic
│   │   └── style.css      # Styles
│   ├── index.html         # HTML entry point
│   └── package.json
│
├── server/                 # Backend (Express + Node.js)
│   ├── index.js           # Server & API routes
│   ├── db.json            # Database (lowdb)
│   ├── uploads/           # Product images
│   └── package.json
│
├── PRODUCTION_READY.md     # Deployment guide
├── TESTING_CHECKLIST.md    # Testing procedures
└── VERIFICATION_CHECKLIST.md  # Cleanup report
```

---

## 🔑 Key Features

### Customer Features
- ✅ Browse products by category
- ✅ Search products
- ✅ View product details
- ✅ Build custom combo packages
- ✅ Apply discount codes
- ✅ Place orders
- ✅ WhatsApp contact button

### Admin Features
- ✅ Manage orders (view, confirm, cancel)
- ✅ Manage products (add, edit, delete)
- ✅ Configure settings (Telegram, WhatsApp)
- ✅ Manage discount codes
- ✅ Generate invoices
- ✅ View analytics

### Technical Features
- ✅ Telegram order notifications
- ✅ Image upload for products
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ SEO optimized
- ✅ Fast performance

---

## ⚙️ Configuration

### Update Settings

Edit `server/db.json` → `settings` section:

```json
{
  "settings": {
    "adminPassword": "your_secure_password",
    "telegramBotToken": "your_bot_token",
    "telegramChatId": "your_chat_id",
    "whatsappNumber": "your_whatsapp_number",
    "discounts": []
  }
}
```

Or update via **Admin Panel → Settings Tab**

---

## 🧪 Testing

### Run Full Test Suite

Follow the comprehensive checklist:
```bash
# Open in browser
start TESTING_CHECKLIST.md
```

### Quick Smoke Test

1. ✅ Homepage loads
2. ✅ Products display
3. ✅ Can place an order
4. ✅ Admin login works
5. ✅ Order appears in admin panel

---

## 📦 Deployment

### Option 1: Simple VPS

```bash
# On server
git clone <your-repo>
cd Orgalife
cd server && npm install
cd ../client && npm install && npm run build

# Start with PM2
cd ../server
pm2 start index.js --name orgalife
pm2 save
```

### Option 2: Heroku

```bash
# Add Procfile to root
echo "web: cd server && node index.js" > Procfile

# Deploy
heroku create orgalife
git push heroku main
```

### Option 3: Vercel + Railway

- Deploy `client/` to Vercel
- Deploy `server/` to Railway
- Update API_URL in client

**See `PRODUCTION_READY.md` for detailed deployment instructions.**

---

## 🔒 Security Checklist

Before going live:

- [ ] Change admin password from "prezom"
- [ ] Update WhatsApp number
- [ ] Verify Telegram credentials
- [ ] Enable HTTPS
- [ ] Add rate limiting (optional)
- [ ] Backup database regularly

---

## 📞 Support

### Common Issues

**Q: Server won't start**
- Check if port 5000 is available
- Verify all dependencies installed: `npm install`

**Q: Client won't connect to server**
- Ensure server is running on port 5000
- Check CORS settings in `server/index.js`

**Q: Telegram notifications not working**
- Verify bot token and chat ID in settings
- Test with: `node test_telegram.js` (if available)

**Q: Images not loading**
- Check `server/uploads/` directory exists
- Verify image paths in database

---

## 📚 Documentation

- **Deployment Guide:** `PRODUCTION_READY.md`
- **Testing Guide:** `TESTING_CHECKLIST.md`
- **Cleanup Report:** `VERIFICATION_CHECKLIST.md`
- **Telegram Setup:** `TELEGRAM_SETUP.md`

---

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server (client)
npm start            # Start server (server)

# Production
npm run build:prod   # Build for production (client)
npm run preview      # Preview production build (client)

# Maintenance
npm install          # Install dependencies
pm2 restart orgalife # Restart server (if using PM2)
pm2 logs orgalife    # View logs (if using PM2)
```

---

## ✅ Production Status

**Version:** 1.0.0  
**Status:** 🟢 Production Ready  
**Last Updated:** 2026-01-07

All testing elements removed ✅  
All bugs fixed ✅  
Performance optimized ✅  
SEO enhanced ✅  
Documentation complete ✅  

**Ready to deploy!** 🚀

---

## 🎉 Get Started Now!

```bash
# Clone and run in 3 steps:
cd server && npm install && npm start &
cd ../client && npm install && npm run dev
# Open http://localhost:5173
```

**Happy selling with Orgalife!** 💝
"# ORGALIFE" 
