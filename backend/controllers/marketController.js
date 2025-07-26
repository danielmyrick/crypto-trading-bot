// backend/controllers/marketController.js
const { getPrices } = require('../services/binanceService');

let cachedPrices = {};
let lastFetch = 0;

exports.getMarketData = async (req, res) => {
    const now = Date.now();

    // Refresh every 5 seconds
    if (now - lastFetch > 5000) {
        try {
            cachedPrices = await getPrices();
            lastFetch = now;
            console.log('✅ Prices updated:', Object.keys(cachedPrices));
        } catch (error) {
            console.error('❌ Price update failed:', error.message);
        }
    }

    res.json(cachedPrices);
};