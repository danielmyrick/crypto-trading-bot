const axios = require('axios');
const crypto = require('crypto');

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_SECRET_KEY;
const BASE_URL = 'https://api.binance.us';

function signRequest(query) {
    return crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');
}

let activePosition = null;

exports.buy = async (req, res) => {
    const TRADE_SIZE = 35;

    if (activePosition) {
        return res.json({ success: false, message: 'Already in position' });
    }

    try {
        const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol: 'BTCUSDT' }
        });
        const price = parseFloat(priceRes.data.price);
        const qty = (TRADE_SIZE / price).toFixed(6).replace(/\.?0+$/, '');

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

        activePosition = {
            symbol: 'BTC/USDT',
            buyPrice: price,
            qty: parseFloat(orderRes.data.executedQty),
            invested: TRADE_SIZE
        };

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} of BTC`,
            position: activePosition
        });
    } catch (error) {
        console.error('BUY ERROR:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Buy failed' });
    }
};

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

        const usdt = res.data.balances.find(b => b.asset === 'USDT');
        const btc = res.data.balances.find(b => b.asset === 'BTC');

        res.json({
            usdt: usdt ? parseFloat(usdt.free) : 0,
            btc: btc ? parseFloat(btc.free) : 0
        });
    } catch (error) {
        console.error('Balance fetch failed:', error.response?.data || error.message);
        res.json({ usdt: 109, btc: 0 });
    }
};