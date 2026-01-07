# Quick Start Guide - Admin Dashboard & Telegram

## 🚀 How to Access Admin Dashboard

1. **Open your browser** and navigate to:
   ```
   http://localhost:5174/#/admin-prezom
   ```

2. **Login** with password: `prezom`

3. **View Orders Tab** - You'll see the enhanced order display!

---

## 📱 What You'll See in the Orders Tab

### Enhanced Order Cards

Each order is now displayed as a beautiful card with:

```
┌─────────────────────────────────────────────────────────┐
│  Order #1234                          [Pending Badge]   │
│                                       [✔] [✖] [🖨️]      │
│  👤 Customer: MD Nahid Hasan                            │
│  📞 Phone: 01305010956                                  │
│  📍 Address: tarakandi-2055,sorishabari,jamalpur...     │
│  📅 Date: 1/7/2026, 7:16:05 PM                          │
│                                                          │
│  🛒 Ordered Items:                                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ [Image] Plastic Rose                           │    │
│  │         Quantity: 1 × ৳700              ৳700   │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │ [Image] Couple Ring                            │    │
│  │         Quantity: 1 × ৳1200            ৳1200   │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│                              💰 Total: ৳2700            │
└─────────────────────────────────────────────────────────┘
```

---

## 📲 Telegram Notification Format

When a customer places an order, you'll receive this in Telegram:

```
📦 New Order Received!
--------------------------------
Order ID: #1234

👤 Customer Name: MD Nahid Hasan
📞 Phone: 01305010956
📍 Address: tarakandi-2055,sorishabari,jamalpur,Bangladesh

🛒 Items:
• Plastic Rose - ৳700
• Couple Ring - ৳1200

💰 Total Amount: ৳2700
--------------------------------
```

**Plus:** Product images will be sent as separate photos!

---

## 🔧 Managing Orders

### Update Order Status

**To Confirm an Order:**
- Click the green ✔ button
- Status changes to "Confirmed" (green badge)

**To Cancel an Order:**
- Click the red ✖ button  
- Status changes to "Cancelled" (red badge)

**To Print Invoice:**
- Click the 🖨️ button
- Opens printable invoice in new window

---

## ⚙️ Telegram Settings

### Check Your Telegram Configuration

1. Go to **Admin Dashboard → Settings Tab**
2. Verify these fields are filled:
   - **Telegram Bot Token**: `8210984723:AAHJ2gh2ha6orqbExxk5as4DhJagYBcFS9k`
   - **Telegram Chat ID**: `5320621404`

### If Notifications Aren't Working

**Check the server console** for these messages:

✅ **Success:**
```
[Order] New order created: #1234 - MD Nahid Hasan - ৳2700
[Telegram] Sending notification for order #1234
[Telegram] Message sent successfully
```

❌ **Problem:**
```
[Telegram] Missing credentials - Token: Missing, ChatId: Missing
```
→ Update credentials in Admin Settings

```
[Telegram] Failed to send message: 401 Unauthorized
```
→ Bot token is invalid, get a new one from @BotFather

---

## 🧪 Test the System

### Quick Test Steps:

1. **Place a Test Order:**
   - Go to http://localhost:5174
   - Click "Buy Now" on any product
   - Fill in customer details
   - Submit order

2. **Check Admin Dashboard:**
   - Refresh the Orders tab
   - Verify you see the new order with:
     - ✅ Customer details
     - ✅ Product images
     - ✅ Correct total

3. **Check Telegram:**
   - Open your Telegram chat
   - Verify you received:
     - ✅ Order notification message
     - ✅ Product images

4. **Test Status Update:**
   - Click ✔ to confirm the order
   - Verify badge turns green
   - Refresh page - status should persist

---

## 📊 Console Logs to Monitor

When running the server, watch for these logs:

```bash
Server running at http://localhost:5000
[Order] New order created: #1234 - Customer Name - ৳700
[Telegram] Sending notification for order #1234
[Telegram] Message sent successfully
```

These logs confirm everything is working correctly!

---

## 🎯 Key Features Summary

✅ **Admin Dashboard:**
- Full customer information visible
- Product images displayed
- Order status management
- Print invoices

✅ **Telegram Notifications:**
- Instant notifications on new orders
- Complete order details
- Product images included
- Uses settings from database

✅ **Database:**
- Product images saved in order history
- Orders remain complete even if products change
- All data persists in `db.json`

---

## 🆘 Need Help?

Check `ENHANCEMENT_SUMMARY.md` for detailed technical documentation and troubleshooting guide.

---

**Everything is ready to use! 🎉**
