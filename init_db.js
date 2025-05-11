const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('exchange.db');

const currencies = [
    'CASH_EUR', 'CASH_USD', 'CASH_RUB',
    'USDT_TRC20', 'USDT_ERC20', 'USDT_BEP20',
    'USDC_ERC20', 'USDC_BEP20',
    'TON', 'BTC', 'ETH'
];

// 1. Установить все резервы = 999
currencies.forEach(code => {
    db.run(
        `INSERT OR REPLACE INTO reserves (currency, amount, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [code, 999]
    );
});

// 2. Добавить пары и курсы (примерно)
const pairs = [
    // Крипта <-> Кэш
    ['BTC', 'CASH_EUR', 60000],
    ['ETH', 'CASH_EUR', 3000],
    ['TON', 'CASH_EUR', 5],
    ['USDT_TRC20', 'CASH_EUR', 0.92],
    ['USDT_ERC20', 'CASH_EUR', 0.92],
    ['USDT_BEP20', 'CASH_EUR', 0.92],
    ['USDC_ERC20', 'CASH_EUR', 0.92],
    ['USDC_BEP20', 'CASH_EUR', 0.92],
    // Кэш <-> Крипта (обратные)
    ['CASH_EUR', 'BTC', 1/60000],
    ['CASH_EUR', 'ETH', 1/3000],
    ['CASH_EUR', 'TON', 1/5],
    ['CASH_EUR', 'USDT_TRC20', 1/0.92],
    ['CASH_EUR', 'USDT_ERC20', 1/0.92],
    ['CASH_EUR', 'USDT_BEP20', 1/0.92],
    ['CASH_EUR', 'USDC_ERC20', 1/0.92],
    ['CASH_EUR', 'USDC_BEP20', 1/0.92],
    // USDT <-> Крипта
    ['USDT_TRC20', 'BTC', 1/60000],
    ['USDT_TRC20', 'ETH', 1/3000],
    ['USDT_TRC20', 'TON', 1/5],
    ['BTC', 'USDT_TRC20', 60000],
    ['ETH', 'USDT_TRC20', 3000],
    ['TON', 'USDT_TRC20', 5],
    // USDT <-> USDC
    ['USDT_TRC20', 'USDC_ERC20', 1],
    ['USDC_ERC20', 'USDT_TRC20', 1],
    // Кэш <-> Кэш
    ['CASH_EUR', 'CASH_USD', 1.08],
    ['CASH_USD', 'CASH_EUR', 1/1.08],
    ['CASH_EUR', 'CASH_RUB', 95],
    ['CASH_RUB', 'CASH_EUR', 1/95],
    ['CASH_USD', 'CASH_RUB', 88],
    ['CASH_RUB', 'CASH_USD', 1/88],
];

pairs.forEach(([from, to, rate]) => {
    db.run(
        `INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, rate, last_updated) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [from, to, rate]
    );
    db.run(
        `INSERT OR REPLACE INTO trading_pairs (from_currency, to_currency, is_active) VALUES (?, ?, 1)`,
        [from, to]
    );
});

db.close();
console.log('Остатки, пары и курсы обновлены.');
