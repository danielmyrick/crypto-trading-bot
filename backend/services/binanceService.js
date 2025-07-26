// backend/services/binanceService.js
const Binance = require('binance-api-node').default;

// Use Binance.us API
const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_SECRET_KEY,
    httpBase: 'https://api.binance.us'
});

// Fetch real prices from Binance.us
async function getPrices() {
    try {
        const ticker = await client.prices();

        return {
            'BTC/USDT': {
                price: parseFloat(ticker.BTCUSDT) || 0,
                change: 'N/A'
            },
            'ETH/USDT': {
                price: parseFloat(ticker.ETHUSDT) || 0,
                change: 'N/A'
            },
            'SOL/USDT': {
                price: parseFloat(ticker.SOLUSDT) || 0,
                change: 'N/A'
            },
            'BNB/USDT': {
                price: parseFloat(ticker.BNBUSDT) || 0,
                change: 'N/A'
            },
            'XRP/USDT': {
                price: parseFloat(ticker.XRPUSDT) || 0,
                change: 'N/A'
            }
        };
    } catch (error) {
        console.error('❌ Binance.us price fetch failed:', error.message);
        // Fallback prices
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