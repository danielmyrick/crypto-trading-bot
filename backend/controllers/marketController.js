// backend/controllers/marketController.js

// Manually require the service
const binanceService = require('../services/binanceService');
const getPrices = binanceService.getPrices;

let cachedPrices = {};
let lastFetch = 0;

exports.getMarketData = async (req, res) => {
    const now = Date.now();

    // Refresh every 5 seconds
    if (now - lastFetch > 5000) {
        try {
            const prices = await getPrices();
            cachedPrices = prices;
            lastFetch = now;
            console.log('✅ Prices updated:', Object.keys(prices));
        } catch (error) {
            console.error('❌ Price update failed:', error.message);
        }
    }

    res.json(cachedPrices);
};