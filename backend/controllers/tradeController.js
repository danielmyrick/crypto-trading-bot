// backend/controllers/tradeController.js
const { getPrices } = require('../services/binanceService');

let activePosition = null;
let currentPrice = 0;

// Buy BTC
exports.buy = async (req, res) => {
    const TRADE_SIZE = parseFloat(process.env.TRADE_SIZE || 35);

    if (activePosition) {
        return res.json({ success: false, message: 'Already in position' });
    }

    try {
        const prices = await getPrices();
        currentPrice = prices['BTC/USDT'].price;

        const qty = TRADE_SIZE / currentPrice;

        activePosition = {
            symbol: 'BTC/USDT',
            buyPrice: currentPrice,
            qty: qty,
            invested: TRADE_SIZE
        };

        console.log('✅ BOUGHT:', activePosition);

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} of BTC at $${currentPrice.toFixed(2)}`,
            position: activePosition
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Sell at +4% or -2%
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

// Get status
exports.status = (req, res) => {
    res.json({ activePosition });
};