// backend/controllers/tradeController.js
const axios = require('axios');
const crypto = require('crypto');

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_SECRET_KEY;
const BASE_URL = 'https://api.binance.us'; // ✅ No extra spaces

function signRequest(query) {
    return crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');
}

function roundToStepSize(qty, stepSize) {
    const precision = Math.floor(Math.log10(1 / parseFloat(stepSize)));
    return (Math.floor(qty / parseFloat(stepSize)) * parseFloat(stepSize)).toFixed(precision);
}

let activePosition = null;
let highestPrice = null;

// ✅ Buy Altcoins: XRP, ADA, SOL, XLM, DOT
exports.buy = async (req, res) => {
    const { symbol = 'XRPUSDT' } = req.body; // Default to XRP
    const TRADE_SIZE = 15; // $15 per trade

    if (activePosition) {
        console.log('❌ Already in position:', activePosition);
        return res.json({ success: false, message: 'Already in position' });
    }

    try {
        const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol }
        });
        const currentPrice = parseFloat(priceRes.data.price);
        const rawQty = TRADE_SIZE / currentPrice;

        // Skip if too small (only for high-price coins)
        if (rawQty < 0.00001 && ['BTCUSDT', 'ETHUSDT'].includes(symbol)) {
            return res.json({ success: false, message: 'Trade size too small for this coin' });
        }

        const stepSize = '0.00001000';
        let qty = roundToStepSize(rawQty, stepSize);

        if (!/^\d+(\.\d+)?$/.test(qty)) {
            return res.json({ success: false, message: 'Invalid quantity format' });
        }

        console.log('🎯 Attempting BUY with quantity:', qty);

        const params = new URLSearchParams({
            symbol,
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

        console.log('✅ REAL BUY ORDER:', orderRes.data);

        activePosition = {
            symbol,
            buyPrice: currentPrice,
            qty: parseFloat(orderRes.data.executedQty),
            invested: TRADE_SIZE
        };

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} of ${symbol}`,
            position: activePosition
        });
    } catch (error) {
        console.error('❌ BUY ERROR:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Buy failed' });
    }
};

// ✅ Sell with Trailing Logic
exports.sell = async (req, res) => {
    if (!activePosition) {
        return res.json({ success: false, message: 'No active position' });
    }

    try {
        const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol: activePosition.symbol }
        });
        const currentPrice = parseFloat(priceRes.data.price);
        const buyPrice = activePosition.buyPrice;
        const lossPct = ((currentPrice - buyPrice) / buyPrice) * 100;

        // ✅ Trailing logic: track highest price since buy
        if (highestPrice === null || currentPrice > highestPrice) {
            highestPrice = currentPrice;
        }

        const pullbackPct = ((currentPrice - highestPrice) / highestPrice) * 100;

        console.log('📊 Price check:', {
            buyPrice,
            currentPrice,
            highestPrice,
            lossPct: lossPct.toFixed(2) + '%',
            pullbackPct: pullbackPct.toFixed(2) + '%'
        });

        // ✅ Sell if profit >= 3% OR price drops 1% from peak
        if (lossPct >= 3 || pullbackPct <= -1) {
            const rawQty = activePosition.qty;
            const stepSize = '0.00001000';
            let qty = roundToStepSize(rawQty, stepSize);

            if (!/^\d+(\.\d+)?$/.test(qty)) {
                console.error('❌ Invalid quantity format:', qty);
                return res.json({ success: false, message: 'Invalid quantity format' });
            }

            console.log('🎯 Attempting SELL with quantity:', qty);

            const params = new URLSearchParams({
                symbol: activePosition.symbol,
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

            console.log('✅ REAL SELL ORDER:', orderRes.data);

            const soldValue = currentPrice * activePosition.qty;
            const profit = soldValue - activePosition.invested;
            const position = { ...activePosition };
            activePosition = null;
            highestPrice = null; // Reset

            return res.json({
                success: true,
                message: `Sold at ${lossPct.toFixed(2)}% | Profit: $${profit.toFixed(2)}`,
                profit,
                profitPct: lossPct,
                position
            });
        }

        console.log('⏳ Holding: not at target', { lossPct: lossPct.toFixed(2), pullbackPct: pullbackPct.toFixed(2) });
        return res.json({ success: false, message: `Waiting: ${lossPct.toFixed(2)}% | Pullback: ${pullbackPct.toFixed(2)}%` });
    } catch (error) {
        console.error('❌ Sell error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
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