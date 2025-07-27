const axios = require('axios');

let cachedPrices = {};
let lastFetch = 0;

async function getPrices() {
    try {
        const res = await axios.get('https://api.binance.us/api/v3/ticker/price', {
            params: { symbol: 'BTCUSDT' },
            timeout: 10000
        });
        const btcPrice = parseFloat(res.data.price);

        return {
            'BTC/USDT': { price: btcPrice, change: 'N/A' }
        };
    } catch (error) {
        return { 'BTC/USDT': { price: 60000, change: 'N/A' } };
    }
}

exports.getMarketData = async (req, res) => {
    const now = Date.now();
    if (now - lastFetch > 30000) {
        try {
            cachedPrices = await getPrices();
            lastFetch = now;
        } catch (err) {
            console.error('Price fetch failed:', err.message);
        }
    }
    res.json(cachedPrices);
};