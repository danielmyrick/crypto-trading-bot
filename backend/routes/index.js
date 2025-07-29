// backend/routes/index.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

// ✅ Get prices for multiple altcoins (XRP, ADA, SOL, XLM, DOT)
router.get('/market', async (req, res) => {
    const symbols = ['XRPUSDT', 'ADAUSDT', 'SOLUSDT', 'XLMUSDT', 'DOTUSDT'];

    try {
        const promises = symbols.map(symbol =>
            axios.get('https://api.binance.us/api/v3/ticker/24hr', { params: { symbol } })
        );

        const responses = await Promise.all(promises);
        const data = {};

        responses.forEach((r, i) => {
            const price = parseFloat(r.data.lastPrice);
            const open = parseFloat(r.data.openPrice);
            const change = ((price - open) / open * 100).toFixed(2);
            data[symbols[i]] = {
                price,
                change: `${change > 0 ? '+' : ''}${change}%`
            };
        });

        res.json(data);
    } catch (err) {
        console.error('Failed to fetch market data:', err.message);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

// ✅ Trade routes
router.get('/balance', require('../controllers/tradeController').getBalance);
router.post('/buy', require('../controllers/tradeController').buy);
router.post('/sell', require('../controllers/tradeController').sell);
router.get('/status', require('../controllers/tradeController').status);

module.exports = router;