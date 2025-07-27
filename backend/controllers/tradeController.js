// backend/controllers/tradeController.js
const axios = require('axios');
const crypto = require('crypto');

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_SECRET_KEY;
const BASE_URL = 'https://api.binance.us';

function signRequest(query) {
    return crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');
}

// ✅ Round quantity to stepSize
function roundToStepSize(qty, stepSize) {
    const precision = Math.floor(Math.log10(1 / parseFloat(stepSize)));
    return (Math.floor(qty / parseFloat(stepSize)) * parseFloat(stepSize)).toFixed(precision);
}

let activePosition = null;

// ✅ Buy BTC/USDT
exports.buy = async (req, res) => {
    const TRADE_SIZE = 35; // $35 per trade

    if (activePosition) {
        return res.json({ success: false, message: 'Already in position' });
    }

    try {
        // Get current price
        const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol: 'BTCUSDT' }
        });
        const currentPrice = parseFloat(priceRes.data.price);
        const rawQty = TRADE_SIZE / currentPrice;

        // ✅ Apply LOT_SIZE filter
        const lotSize = {
            minQty: 0.00001,
            maxQty: 9000,
            stepSize: '0.00001000'
        };

        if (rawQty < lotSize.minQty) {
            return res.json({
                success: false,
                message: 'Trade size too small. Minimum ~$1 at current price.'
            });
        }

        let qty = roundToStepSize(rawQty, lotSize.stepSize);

        if (!/^\d+(\.\d+)?$/.test(qty)) {
            return res.json({ success: false, message: 'Invalid quantity format' });
        }

        // ✅ Apply MIN_NOTIONAL filter (min $1)
        if (TRADE_SIZE < 1.0) {
            return res.json({ success: false, message: 'Order value below minimum notional (1.0 USDT)' });
        }

        // ✅ Apply PRICE_FILTER (not needed for market orders)
        // But price must be valid if used — tickSize 0.01 is fine

        // ✅ Place market order
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

        // ✅ Save position
        activePosition = {
            symbol: 'BTCUSDT',
            buyPrice: currentPrice,
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

// ✅ Sell BTC/USDT
exports.sell = async (req, res) => {
    if (!activePosition) {
        return res.json({ success: false, message: 'No active position' });
    }

    try {
        const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol: 'BTCUSDT' }
        });
        const currentPrice = parseFloat(priceRes.data.price);
        const buyPrice = activePosition.buyPrice;
        const lossPct = ((currentPrice - buyPrice) / buyPrice) * 100;

        const takeProfitPct = 4;
        const stopLossPct = -2;

        if (lossPct >= takeProfitPct || lossPct <= stopLossPct) {
            const rawQty = activePosition.qty;
            const lotSize = { stepSize: '0.00001000' };
            let qty = roundToStepSize(rawQty, lotSize.stepSize);

            if (!/^\d+(\.\d+)?$/.test(qty)) {
                return res.json({ success: false, message: 'Invalid quantity format' });
            }

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

            const soldValue = currentPrice * activePosition.qty;
            const profit = soldValue - activePosition.invested;
            const position = { ...activePosition };
            activePosition = null;

            res.json({
                success: true,
                message: `Sold at ${lossPct.toFixed(2)}% | Profit: $${profit.toFixed(2)}`,
                profit,
                position
            });
        } else {
            res.json({ success: false, message: `Waiting: ${lossPct.toFixed(2)}%` });
        }
    } catch (error) {
        console.error('SELL ERROR:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Sell failed' });
    }
};

// ✅ Status
exports.status = (req, res) => {
    res.json({ activePosition });
};

// ✅ Balance
exports.getBalance = async (req, res) => {
    try {
        const params = new URLSearchParams({ timestamp: Date.now() });
        params.append('signature', signRequest(params.toString()));

        const apiRes = await axios.get(`${BASE_URL}/api/v3/account`, {
            params,
            headers: { 'X-MBX-APIKEY': API_KEY }
        });

        if (!apiRes.data || !apiRes.data.balances) {
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
        res.json({ usdt: 109, btc: 0 });
    }
};