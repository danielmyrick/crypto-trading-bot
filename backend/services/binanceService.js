// backend/services/binanceService.js
const { Spot } = require('@binance/connector');

// Initialize Binance.us client
const client = new Spot(
    process.env.BINANCE_API_KEY,
    process.env.BINANCE_SECRET_KEY,
    { baseURL: 'https://api.binance.us' }
);

// Fetch real prices
async function getPrices() {
    try {
        const ticker = await client.tickerPrice();

        // Convert to our format
        const prices = {};
        const pairs = {
            BTCUSDT: 'BTC/USDT',
            ETHUSDT: 'ETH/USDT',
            SOLUSDT: 'SOL/USDT',
            BNBUSDT: 'BNB/USDT',
            XRPUSDT: 'XRP/USDT'
        };

        Object.entries(pairs).forEach(([symbol, label]) => {
            const price = ticker.find(t => t.symbol === symbol);
            prices[label] = {
                price: price ? parseFloat(price.price) : 0,
                change: 'N/A'
            };
        });

        return prices;
    } catch (error) {
        console.error('❌ Binance.us price fetch failed:', error.message);
        return {
            'BTC/USDT': { price: 60000, change: 'N/A' },
            'ETH/USDT': { price: 3000, change: 'N/A' },
            'SOL/USDT': { price: 150, change: 'N/A' },
            'BNB/USDT': { price: 400, change: 'N/A' },
            'XRP/USDT': { price: 0.5, change: 'N/A' }
        };
    }
}

module.exports = { getPrices };