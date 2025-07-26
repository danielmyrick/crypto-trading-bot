// backend/controllers/tradeController.js
// Using axios for HTTP requests instead of binance-api-node
const axios = require('axios');

// Mock Binance client for price data
const getPrices = async () => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'bitcoin,ethereum,solana,binancecoin,xrp',
                vs_currencies: 'usd'
            },
            headers: { 'User-Agent': 'CryptoBot/1.0' },
            timeout: 10000
        });

        const data = response.data;
        return {
            'BTC/USDT': { price: data.bitcoin?.usd || 60000, change: 'N/A' },
            'ETH/USDT': { price: data.ethereum?.usd || 3000, change: 'N/A' },
            'SOL/USDT': { price: data.solana?.usd || 150, change: 'N/A' },
            'BNB/USDT': { price: data.binancecoin?.usd || 400, change: 'N/A' },
            'XRP/USDT': { price: data.xrp?.usd || 0.5, change: 'N/A' }
        };
    } catch (error) {
        console.error('Price fetch failed:', error.message);
        return {
            'BTC/USDT': { price: 60000, change: 'N/A' },
            'ETH/USDT': { price: 3000, change: 'N/A' },
            'SOL/USDT': { price: 150, change: 'N/A' },
            'BNB/USDT': { price: 400, change: 'N/A' },
            'XRP/USDT': { price: 0.5, change: 'N/A' }
        };
    }
};

let activePosition = null;

// Buy BTC
exports.buy = async (req, res) => {
    const TRADE_SIZE = parseFloat(process.env.TRADE_SIZE || 40);

    if (activePosition) {
        return res.json({ success: false, message: 'Already in position' });
    }

    try {
        // Get current price from CoinGecko
        const prices = await getPrices();
        const price = prices['BTC/USDT'].price;

        const qty = TRADE_SIZE / price;

        // Simulate order execution
        activePosition = {
            symbol: 'BTC/USDT',
            buyPrice: price,
            qty: qty,
            invested: TRADE_SIZE
        };

        console.log('✅ BOUGHT:', activePosition);

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} of BTC at $${price.toFixed(2)}`,
            position: activePosition
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Sell logic remains the same
exports.sell = async (req, res) => {
    if (!activePosition) {
        return res.json({ success: false, message: 'No active position' });
    }

    try {
        const prices = await getPrices();
        const currentPrice = prices['BTC/USDT'].price;
        const buyPrice = activePosition.buyPrice;
        const lossPct = ((currentPrice - buyPrice) / buyPrice) * 100;

        const takeProfitPct = parseFloat(process.env.TAKE_PROFIT_PCT || 4);
        const stopLossPct = -2;

        if (lossPct >= takeProfitPct || lossPct <= stopLossPct) {
            const soldValue = currentPrice * activePosition.qty;
            const profit = soldValue - activePosition.invested;

            console.log(`✅ SOLD at ${lossPct.toFixed(2)}% | Profit: $${profit.toFixed(2)}`);
            const position = { ...activePosition };
            activePosition = null;

            return res.json({
                success: true,
                message: `Sold at ${lossPct.toFixed(2)}% | Profit: $${profit.toFixed(2)}`,
                profit,
                profitPct: lossPct,
                position
            });
        }

        return res.json({
            success: false,
            message: `Waiting: ${lossPct.toFixed(2)}% (need +4% or -2%)`
        });

    } catch (error) {
        console.error('Sell error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.status = (req, res) => {
    res.json({ activePosition });
};