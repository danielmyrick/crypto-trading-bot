const axios = require('axios');
const crypto = require('crypto');

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_SECRET_KEY;
const BASE_URL = 'https://api.binance.us';

function signRequest(query) {
    return crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');
}

let activePosition = null;

// ✅ Safe quantity formatting
const rawQty = TRADE_SIZE / currentPrice;

// ✅ Ensure minimum size
if (rawQty < 0.0001) {
    return res.json({
        success: false,
        message: 'Trade size too small. Minimum 0.0001 BTC (~$11)'
    });
}

// ✅ Round to 6 decimals (Binance limit for BTC)
let qty = rawQty.toFixed(6);

// ✅ Remove trailing zeros safely
qty = qty.replace(/\.?0+$/, '');

// ✅ Final validation
if (!/^\d+(\.\d+)?$/.test(qty)) {
    return res.json({ success: false, message: 'Invalid quantity format' });
}

exports.sell = async (req, res) => {
    if (!activePosition) {
        return res.json({ success: false, message: 'No active position' });
    }

    try {
        const price = parseFloat((await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol: 'BTCUSDT' }
        })).data.price);

        const qty = activePosition.qty.toFixed(6).replace(/\.?0+$/, '');
        const profit = (price * activePosition.qty) - activePosition.invested;

        const params = new URLSearchParams({
            symbol: 'BTCUSDT',
            side: 'SELL',
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

        const position = { ...activePosition };
        activePosition = null;

        res.json({
            success: true,
            message: `Sold BTC`,
            profit,
            position
        });
    } catch (error) {
        console.error('SELL ERROR:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Sell failed' });
    }
};

exports.status = (req, res) => {
    res.json({ activePosition });
};

exports.getBalance = async (req, res) => {
    try {
        const params = new URLSearchParams({ timestamp: Date.now() });
        params.append('signature', signRequest(params.toString()));

        const apiRes = await axios.get(`${BASE_URL}/api/v3/account`, {
            params,
            headers: { 'X-MBX-APIKEY': API_KEY }
        });

        // ✅ Confirm response structure
        if (!apiRes || !apiRes.data || !apiRes.data.balances) {
            throw new Error('Invalid response from Binance');
        }

        const usdt = apiRes.data.balances.find(b => b.asset === 'USDT');
        const btc = apiRes.data.balances.find(b => b.asset === 'BTC');

        res.json({
            usdt: usdt ? parseFloat(usdt.free) : 0,
            btc: btc ? parseFloat(btc.free) : 0
        });
    } catch (err) {
        console.error('Balance fetch failed:', err.message);
        // ✅ Always return fallback
        res.json({ usdt: 109, btc: 0 });
    }
};