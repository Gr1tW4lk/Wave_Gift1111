const express = require('express');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, getUserBalance, updateUserBalance, getUserStats, getAllItems, client } = require('./database');
const app = express();

app.use(express.static('public'));
app.use(express.json());

// Initialize database on startup
initializeDatabase();

// Telegram Bot Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '7645029903:AAEuhNNy6DESA3OYE_1s59HMiwcl7DsluaA'; // Замените на ваш реальный токен

// Handle Telegram webhook
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body, null, 2));
  const update = req.body;
  
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    if (text === '/start') {
      const welcomeMessage = `🎁 <b>Добро пожаловать в MetaGift!</b>\n\nПокупайте и дарите уникальные подарки в Telegram!\n\n🌟 <b>Что вас ждет:</b>\n• Эксклюзивные цифровые подарки\n• Передача подарков друзьям\n• Пополнение баланса Stars\n• Реферальная программа\n\nНажмите кнопку ниже чтобы открыть магазин! 👇`;

      const keyboard = {
        inline_keyboard: [[
          {
            text: "🛍️ Открыть магазин",
            web_app: {
              url: "https://metagift-market.replit.app"
            }
          }
        ]]
      };

      sendTelegramMessageWithKeyboard(chatId, welcomeMessage, keyboard);
    } else if (text === '/stars') {
      const starsMessage = `⭐ <b>Telegram Stars</b>\n\nИспользуйте Telegram Stars для покупки подарков!\n\n💰 <b>Преимущества Stars:</b>\n• Быстрая и безопасная оплата\n• Мгновенное зачисление на баланс\n• Покупка подарков одним кликом\n\nОткройте магазин чтобы пополнить баланс Stars! 👇`;

      const keyboard = {
        inline_keyboard: [[
          {
            text: "⭐ Открыть магазин Stars",
            web_app: {
              url: "https://metagift-market.replit.app"
            }
          }
        ]]
      };

      sendTelegramMessageWithKeyboard(chatId, starsMessage, keyboard);
    }
  }
  
  res.status(200).send('OK');
});

// Currency rates and payment configuration
const CURRENCY_RATES = {
  TON_TO_STARS: 100, // 1 TON = 100 Stars
  TON_TO_RUBLE: 300, // 1 TON = 300 рублей (примерный курс)
  STARS_TO_RUBLE: 3   // 1 Star = 3 рубля
};

const PAYMENT_METHODS = {
  STARS: {
    name: 'Telegram Stars',
    icon: 'https://i.postimg.cc/3N3f5zhH/IMG-1243.png',
    contact: '@MetaGift_support'
  },
  YOOMONEY: {
    name: 'ЮMoney',
    icon: 'https://thumb.tildacdn.com/tild6365-6562-4437-a465-306531386233/-/format/webp/4.png',
    wallet: '4100118542839036'
  },
  TON: {
    name: 'TON Wallet',
    icon: 'https://ton.org/download/ton_symbol.png',
    wallet: 'UQDy5hhPvhwcNY9g-lP-nkjdmx4rAVZGFEnhOKzdF-JcIiDW'
  }
};

// Convert TON price to other currencies
function convertPrice(tonPrice, targetCurrency) {
  switch (targetCurrency) {
    case 'STARS':
      return Math.ceil(tonPrice * CURRENCY_RATES.TON_TO_STARS);
    case 'YOOMONEY':
      return Math.ceil(tonPrice * CURRENCY_RATES.TON_TO_RUBLE);
    case 'TON':
      return tonPrice;
    default:
      return tonPrice;
  }
}

// Function to send message via Telegram Bot API
async function sendTelegramMessage(userId, message, parse_mode = 'HTML') {
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('Bot token not configured, skipping message send');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: userId,
        text: message,
        parse_mode: parse_mode
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log(`✅ Message sent successfully to user ${userId}`);
      return true;
    } else {
      console.log(`❌ Failed to send message to user ${userId}:`, result.description);
      return false;
    }
  } catch (error) {
    console.error(`Error sending message to user ${userId}:`, error);
    return false;
  }
}

// Function to send message with inline keyboard
async function sendTelegramMessageWithKeyboard(chatId, message, keyboard, parse_mode = 'HTML') {
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('Bot token not configured, skipping message send');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parse_mode,
        reply_markup: keyboard
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log(`✅ Message with keyboard sent successfully to chat ${chatId}`);
      return true;
    } else {
      console.log(`❌ Failed to send message with keyboard to chat ${chatId}:`, result.description);
      return false;
    }
  } catch (error) {
    console.error(`Error sending message with keyboard to chat ${chatId}:`, error);
    return false;
  }
}

// Data file paths
const DATA_FILE = path.join(__dirname, 'data.json');
const ACTIVITY_FILE = path.join(__dirname, 'activity.json');
const INVENTORY_FILE = path.join(__dirname, 'inventory.json');
const USER_STATS_FILE = path.join(__dirname, 'user-stats.json');
const REFERRALS_FILE = path.join(__dirname, 'referrals.json');
const PAYMENT_REQUESTS_FILE = path.join(__dirname, 'payment-requests.json');
const USER_BALANCE_FILE = path.join(__dirname, 'user-balance.json');

// Load data from files or use defaults
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading data file, using defaults');
    }

    return [
  {
    id: 9181,
    name: "Pink Flamingo x1 Co...",
    image: "https://i.postimg.cc/Y02HBW8v/IMG-1194.png",
    price: 10,
    quantity: "x1",
    stock: 3,
    tag: "NEW",
    tagColor: "new"
  },
  {
    id: 9180,
    name: "Sand Castle x1",
    image: "🏰",
    price: 3.3,
    quantity: "x1",
    stock: 5,
    tag: "HOT",
    tagColor: "hot"
  },
  {
    id: 9179,
    name: "Sand Castle x1",
    image: "🏰",
    price: 3.68,
    quantity: "x1",
    stock: 2,
    tag: "",
    tagColor: "new"
  },
  {
    id: 9178,
    name: "Eagle x2",
    image: "🦅",
    price: 150,
    quantity: "x2",
    stock: 1,
    tag: "RARE",
    tagColor: "rare"
  },
  {
    id: 7549,
    name: "Case x1",
    image: "💼",
    price: 39,
    quantity: "x1",
    stock: 4,
    tag: "TOP",
    tagColor: "top"
  },
  {
    id: 7539,
    name: "Case x1",
    image: "💼",
    price: 41,
    quantity: "x1",
    stock: 2,
    tag: "SALE",
    tagColor: "sale"
  }
];
}

function loadActivityData() {
    try {
        if (fs.existsSync(ACTIVITY_FILE)) {
            const data = fs.readFileSync(ACTIVITY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading activity file');
    }
    return [];
}

function loadInventoryData() {
    try {
        if (fs.existsSync(INVENTORY_FILE)) {
            const data = fs.readFileSync(INVENTORY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading inventory file');
    }
    return [];
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Error saving data:', error);
    }
}

function saveActivityData(data) {
    try {
        fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Error saving activity:', error);
    }
}

function saveInventoryData(data) {
    try {
        fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Error saving inventory:', error);
    }
}

function loadUserStatsData() {
    try {
        if (fs.existsSync(USER_STATS_FILE)) {
            const data = fs.readFileSync(USER_STATS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading user stats file');
    }
    return {};
}

function saveUserStatsData(data) {
    try {
        fs.writeFileSync(USER_STATS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Error saving user stats:', error);
    }
}

function loadReferralsData() {
    try {
        if (fs.existsSync(REFERRALS_FILE)) {
            const data = fs.readFileSync(REFERRALS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading referrals file');
    }
    return {};
}

function saveReferralsData(data) {
    try {
        fs.writeFileSync(REFERRALS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Error saving referrals:', error);
    }
}

function loadPaymentRequestsData() {
    try {
        if (fs.existsSync(PAYMENT_REQUESTS_FILE)) {
            const data = fs.readFileSync(PAYMENT_REQUESTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading payment requests file');
    }
    return [];
}

function savePaymentRequestsData(data) {
    try {
        fs.writeFileSync(PAYMENT_REQUESTS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Error saving payment requests:', error);
    }
}

function loadUserBalanceData() {
    try {
        if (fs.existsSync(USER_BALANCE_FILE)) {
            const data = fs.readFileSync(USER_BALANCE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error loading user balance file');
    }
    return {};
}

function saveUserBalanceData(data) {
    try {
        fs.writeFileSync(USER_BALANCE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.log('Error saving user balance:', error);
    }
}

// Load initial data
let nftItems = loadData();
let activityItems = loadActivityData();
let inventoryItems = loadInventoryData();
let userStatsData = loadUserStatsData();
let referralsData = loadReferralsData();
let paymentRequestsData = loadPaymentRequestsData();
let userBalanceData = loadUserBalanceData();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/tonconnect-manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tonconnect-manifest.json'));
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await getAllItems();
    res.json(items);
  } catch (error) {
    console.error('Error getting items:', error);
    res.json([]);
  }
});

app.get('/api/activity', (req, res) => {
  res.json(activityItems);
});

app.get('/api/inventory', (req, res) => {
  res.json(inventoryItems);
});

app.get('/api/inventory/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userInventory = inventoryItems.filter(item => item.userId === userId);
  res.json(userInventory);
});

app.get('/api/user-stats/:userId', (req, res) => {
  const userId = req.params.userId;
  const stats = userStatsData[userId] || {
    totalPurchases: 0,
    totalSpent: 0,
    referralCount: 0,
    referralEarnings: 0
  };
  res.json(stats);
});

app.get('/api/user-balance/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const stars = await getUserBalance(userId);
    res.json({ stars });
  } catch (error) {
    console.error('Error getting user balance:', error);
    res.json({ stars: 0 });
  }
});

// Get payment methods and converted prices for an item
app.get('/api/payment-methods/:itemId', (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const data = loadData();
  const item = data.find(i => i.id === itemId);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const paymentMethods = [];

  // Only allow payment with STARS (balance)
  const starsPrice = item.prices?.STARS || Math.ceil(item.price * CURRENCY_RATES.TON_TO_STARS);

  if (starsPrice > 0) {
      paymentMethods.push({
        id: 'STARS',
        name: 'Telegram Stars',
        icon: PAYMENT_METHODS.STARS.icon,
        price: starsPrice,
        contact: PAYMENT_METHODS.STARS.contact
      });
  }

  res.json({ paymentMethods });
});

app.post('/api/items', async (req, res) => {
  const newItem = req.body;

  try {
    const existingItem = await client.query('SELECT id FROM items WHERE id = $1', [newItem.id]);
    if (existingItem.rows.length > 0) {
      return res.status(400).json({ error: 'Item with this ID already exists' });
    }

    await client.query(`
      INSERT INTO items (id, name, image, description, price_ton, price_stars, price_rub, quantity, stock, tag, tag_color, status, status_color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [newItem.id, newItem.name, newItem.image, newItem.description, newItem.price_ton, newItem.price_stars, newItem.price_rub, newItem.quantity, newItem.stock, newItem.tag, newItem.tag_color, newItem.status, newItem.status_color]);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.post("/api/buy/:id", async (req, res) => {
  const itemId = parseInt(req.params.id);
  const { userId, username, referrerId, paymentMethod, starsPrice } = req.body;

  if (paymentMethod !== 'STARS') {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  try {
    // Check user balance
    const currentBalance = await getUserBalance(userId);
    if (currentBalance < starsPrice) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Decrease user balance
    await updateUserBalance(userId, currentBalance - starsPrice);

    // Get item from database
    const itemResult = await client.query('SELECT * FROM items WHERE id = $1', [itemId]);
    if (itemResult.rows.length === 0 || itemResult.rows[0].stock <= 0) {
      return res.status(400).json({ error: 'Item not available' });
    }
    const item = itemResult.rows[0];

    // Decrease stock in database
    await client.query('UPDATE items SET stock = stock - 1 WHERE id = $1', [itemId]);

    // Add to inventory
    const inventoryItem = {
      inventoryId: Date.now() + Math.random(), // Unique inventory ID
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price_ton,
      prices: { TON: item.price_ton, STARS: item.price_stars, RUB: item.price_rub },
      convertedPrice: starsPrice,
      quantity: item.quantity,
      owner: '@' + username,
      userId: userId,
      username: username || 'user',
      nickname: null,
      status: 'Редкий',
      createdAt: new Date().toISOString()
    };

    inventoryItems.push(inventoryItem);
    saveInventoryData(inventoryItems);

    // Add to activity
    const activityItem = {
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price_ton,
      prices: { TON: item.price_ton, STARS: item.price_stars, RUB: item.price_rub },
      convertedPrice: starsPrice,
      userId: userId,
      username: username,
      date: new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      }),
      time: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    activityItems.unshift(activityItem);
    saveActivityData(activityItems);

    res.json({ success: true, newBalance: currentBalance - starsPrice });

  } catch (error) {
    console.error('Error during purchase:', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('To set webhook, visit: https://metagift-market.replit.app/set-webhook');
  console.log('To check webhook, visit: https://metagift-market.replit.app/webhook-info');
});


