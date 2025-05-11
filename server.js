const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Database setup
const db = new sqlite3.Database('exchange.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Create exchange rates table
        db.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_currency TEXT NOT NULL,
            to_currency TEXT NOT NULL,
            rate REAL NOT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(from_currency, to_currency)
        )`);

        // Create reserves table
        db.run(`CREATE TABLE IF NOT EXISTS reserves (
            currency TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create trading pairs table
        db.run(`CREATE TABLE IF NOT EXISTS trading_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_currency TEXT NOT NULL,
            to_currency TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            UNIQUE(from_currency, to_currency)
        )`);
    });
}

// Update exchange rates from Binance
async function updateExchangeRates() {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price');
        const prices = await response.json();
        
        // Update rates in database
        const stmt = db.prepare('INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, rate, last_updated) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
        
        prices.forEach(price => {
            const symbol = price.symbol;
            const rate = parseFloat(price.price);
            
            // Handle USDT pairs
            if (symbol.endsWith('USDT')) {
                const baseCurrency = symbol.replace('USDT', '');
                stmt.run(baseCurrency, 'USDT', 1/rate);
                stmt.run('USDT', baseCurrency, rate);
            }
        });
        
        stmt.finalize();
        console.log('Exchange rates updated successfully');
    } catch (error) {
        console.error('Error updating exchange rates:', error);
    }
}

// API endpoints
app.get('/api/rates', (req, res) => {
    const { from, to } = req.query;
    
    db.get('SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ?', 
        [from, to], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ rate: row ? row.rate : null });
    });
});

app.get('/api/reserves', (req, res) => {
    db.all('SELECT * FROM reserves', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/trading-pairs', (req, res) => {
    db.all('SELECT * FROM trading_pairs WHERE is_active = 1', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получить список всех валют, которые есть в резервах
app.get('/api/currencies', (req, res) => {
    db.all('SELECT currency, amount FROM reserves', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Update rates every 15 seconds
setInterval(updateExchangeRates, 15000);

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    // Initial update of exchange rates
    updateExchangeRates();
}); 