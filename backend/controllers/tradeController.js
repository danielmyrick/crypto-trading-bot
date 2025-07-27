// backend/controllers/tradeController.js
const axios = require('axios');
const crypto = require('crypto');

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_SECRET_KEY;
const BASE_URL = 'https://api.binance.us';

// Helper: Sign request
function signRequest(query) {
    return crypto
        .createHmac('sha256', API_SECRET)
        .update(query)
        .digest('hex');
}

// Buy BTC/USDT
exports.buy = async (req, res) => {
    const TRADE_SIZE = 35; // $35 per trade

    try {
        // Get current price
        const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol: 'BTCUSDT' }
        });
        const price = parseFloat(priceRes.data.price);
        const qty = (TRADE_SIZE / price).toFixed(6);

        // Place market buy
        const params = new URLSearchParams({
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: qty,
            timestamp: Date.now()
        });
        params.append('signature', signRequest(params.toString()));

        const orderRes = await axios.post(`${BASE_URL}/api/v3/order`, params, {
            headers: {
                'X-MBX-APIKEY': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} of BTC`,
            order: orderRes.data
        });
    } catch (error) {
        console.error('BUY ERROR:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Buy failed' });
    }
};

// Sell BTC/USDT
exports.sell = async (req, res) => {
    try {
        // Get open orders to find position
        const openOrders = await axios.get(`${BASE_URL}/api/v3/openOrders`, {
            params: {
                symbol: 'BTCUSDT',
                timestamp: Date.now()
            },
            headers: {
                'X-MBX-APIKEY': API_KEY
            }
        });

        if (openOrders.data.length === 0) {
            return res.json({ success: false, message: 'No open position' });
        }

        // Sell all BTC
        const params = new URLSearchParams({
            symbol: 'BTCUSDT',
            side: 'SELL',
            type: 'MARKET',
            quantity: openOrders.data[0].origQty,
            timestamp: Date.now()
        });
        params.append('signature', signRequest(params.toString()));

        const orderRes = await axios.post(`${BASE_URL}/api/v3/order`, params, {
            headers: {
                'X-MBX-APIKEY': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.json({
            success: true,
            message: 'Sold BTC',
            order: orderRes.data
        });
    } catch (error) {
        console.error('SELL ERROR:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Sell failed' });
    }
};

exports.status = (req, res) => {
    res.json({ activePosition: null }); // Simplified
};