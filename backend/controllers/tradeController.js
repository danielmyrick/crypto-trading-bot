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
    const step = parseFloat(stepSize);
    const precision = Math.floor(Math.log10(1 / step));
    const rounded = (Math.floor(qty / step) * step).toFixed(precision);
    return parseFloat(rounded).toString();
}

function getStepSize(symbol) {
    if (symbol === 'XRPUSDT') return '1.00000000';
    if (symbol === 'ADAUSDT') return '1.00000000';
    if (symbol === 'SOLUSDT') return '0.01000000';
    if (symbol === 'XLMUSDT') return '1.00000000';
    if (symbol === 'DOTUSDT') return '0.10000000';
    return '0.00001000';
}

let activePositions = []; // ✅ Now supports multiple
let highestPrices = {};   // Track high price per coin

// ✅ Buy Altcoins
exports.buy = async (req, res) => {
    const { symbol = 'XRPUSDT' } = req.body;
    const TRADE_SIZE = 15;

    const existing = activePositions.find(p => p.symbol === symbol);
    if (existing) {
        return res.json({ success: false, message: `Already holding ${symbol}` });
    }

    try {
        const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
            params: { symbol }
        });
        const currentPrice = parseFloat(priceRes.data.price);
        const rawQty = TRADE_SIZE / currentPrice;

        const stepSize = getStepSize(symbol);
        let qty = roundToStepSize(rawQty, stepSize);

        const params = new URLSearchParams({
            symbol,
            side: 'BUY',
            type: 'MARKET',
            quantity: qty,
            timestamp: Date.now()
        });
        params.append('signature', signRequest(params.toString()));

        const orderRes = await axios.post(`${BASE_URL}/api/v3/order`, params, {
            headers: { 'X-MBX-APIKEY': API_KEY }
        });

        activePositions.push({
            symbol,
            buyPrice: currentPrice,
            qty: parseFloat(orderRes.data.executedQty),
            invested: TRADE_SIZE
        });

        highestPrices[symbol] = currentPrice;

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} of ${symbol}`,
            position: activePositions[activePositions.length - 1]
        });
    } catch (error) {
        console.error('BUY ERROR:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Buy failed' });
    }
};

// ✅ Sell with Trailing Logic
exports.sell = async (req, res) => {
    if (activePositions.length === 0) {
        return res.json({ success: false, message: 'No active positions' });
    }

    const closedPositions = [];

    for (let i = activePositions.length - 1; i >= 0; i--) {
        const pos = activePositions[i];
        const symbol = pos.symbol;

        try {
            const priceRes = await axios.get(`${BASE_URL}/api/v3/ticker/price`, {
                params: { symbol }
            });
            const currentPrice = parseFloat(priceRes.data.price);
            const buyPrice = pos.buyPrice;
            const lossPct = ((currentPrice - buyPrice) / buyPrice) * 100;
            const highestPrice = highestPrices[symbol] || buyPrice;
            if (currentPrice > highestPrice) highestPrices[symbol] = currentPrice;
            const pullbackPct = ((currentPrice - highestPrice) / highestPrice) * 100;

            if (lossPct >= 3 || pullbackPct <= -1) {
                const stepSize = getStepSize(symbol);
                const qty = roundToStepSize(pos.qty, stepSize);

                const params = new URLSearchParams({
                    symbol,
                    side: 'SELL',
                    type: 'MARKET',
                    quantity: qty,
                    timestamp: Date.now()
                });
                params.append('signature', signRequest(params.toString()));

                const orderRes = await axios.post(`${BASE_URL}/api/v3/order`, params, {
                    headers: { 'X-MBX-APIKEY': API_KEY }
                });

                const profit = (currentPrice * pos.qty) - pos.invested;
                closedPositions.push({ symbol, profit });

                activePositions.splice(i, 1);
                delete highestPrices[symbol];
            }
        } catch (error) {
            console.error(`Sell error for ${symbol}:`, error.message);
        }
    }

    if (closedPositions.length > 0) {
        return res.json({
            success: true,
            message: `Sold ${closedPositions.length} positions`,
            positions: closedPositions
        });
    }

    return res.json({ success: false, message: 'No positions ready to sell' });
};

// ✅ Status
exports.status = (req, res) => {
    res.json({ activePositions });
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
        const xrp = apiRes.data.balances.find(b => b.asset === 'XRP');
        const ada = apiRes.data.balances.find(b => b.asset === 'ADA');
        const sol = apiRes.data.balances.find(b => b.asset === 'SOL');
        const xlm = apiRes.data.balances.find(b => b.asset === 'XLM');
        const dot = apiRes.data.balances.find(b => b.asset === 'DOT');

        res.json({
            usdt: usdt ? parseFloat(usdt.free) : 0,
            btc: btc ? parseFloat(btc.free) : 0,
            xrp: xrp ? parseFloat(xrp.free) : 0,
            ada: ada ? parseFloat(ada.free) : 0,
            sol: sol ? parseFloat(sol.free) : 0,
            xlm: xlm ? parseFloat(xlm.free) : 0,
            dot: dot ? parseFloat(dot.free) : 0
        });
    } catch (err) {
        console.error('Balance fetch failed:', err.message);
        res.json({ usdt: 109, btc: 0 });
    }
};