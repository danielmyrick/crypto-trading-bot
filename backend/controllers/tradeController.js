// backend/controllers/tradeController.js
const Binance = require('binance-api-node').default;

// Initialize Binance client (Binance.us)
const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_SECRET_KEY,
    httpBase: 'https://api.binance.us'  // ✅ Fixed: no extra spaces
});

let activePosition = null; // { symbol, buyPrice, qty, invested }

// Enhanced buy with filters
exports.buy = async (req, res) => {
    const TRADE_SIZE = parseFloat(process.env.TRADE_SIZE || 40);

    if (activePosition) {
        return res.json({ success: false, message: 'Already in position' });
    }

    try {
        // Get current price
        const ticker = await client.prices({ symbol: 'BTCUSDT' });
        const currentPrice = parseFloat(ticker.BTCUSDT);

        // ✅ FILTER 1: Time of Day
        const hour = new Date().getUTCHours();
        const inWindow = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 21 && hour <= 23);
        if (!inWindow) {
            return res.json({ success: false, message: 'Outside trading window' });
        }

        // ✅ FILTER 2: Recent momentum (> 1.5% in 24h)
        const ticker24 = await client.prevDay({ symbol: 'BTCUSDT' });
        const change24h = parseFloat(ticker24.priceChangePercent);
        if (change24h < 1.5) {
            return res.json({ success: false, message: 'Low momentum: wait' });
        }

        // ✅ FILTER 3: Price above 24h low (proxy for uptrend)
        const low24 = parseFloat(ticker24.lowPrice);
        if (currentPrice <= low24 * 1.02) {
            return res.json({ success: false, message: 'No uptrend detected' });
        }

        // ✅ All filters passed → BUY
        const qty = TRADE_SIZE / currentPrice;

        const order = await client.order({
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: qty
        });

        activePosition = {
            symbol: 'BTCUSDT',
            buyPrice: currentPrice,
            qty: parseFloat(order.executedQty),
            invested: TRADE_SIZE,
            boughtAt: new Date().toISOString()
        };

        console.log('✅ SMART BUY:', activePosition);

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} at $${currentPrice} (trend + momentum)`,
            position: activePosition
        });
    } catch (error) {
        console.error('Buy error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ✅ Sell when profit OR loss threshold is hit
exports.sell = async (req, res) => {
    if (!activePosition) {
        return res.json({ success: false, message: 'No active position' });
    }

    try {
        const ticker = await client.prices({ symbol: 'BTCUSDT' });
        const currentPrice = parseFloat(ticker.BTCUSDT);
        const buyPrice = activePosition.buyPrice;
        const lossPct = ((currentPrice - buyPrice) / buyPrice) * 100;

        const takeProfitPct = parseFloat(process.env.TAKE_PROFIT_PCT || 4);
        const stopLossPct = -2;

        // ✅ Take Profit: +4%
        if (lossPct >= takeProfitPct) {
            const order = await client.order({
                symbol: 'BTCUSDT',
                side: 'SELL',
                type: 'MARKET',
                quantity: activePosition.qty
            });

            const soldValue = currentPrice * activePosition.qty;
            const profit = soldValue - activePosition.invested;

            console.log(`✅ SOLD at +${lossPct.toFixed(2)}% | Profit: $${profit.toFixed(2)}`);
            const position = { ...activePosition };
            activePosition = null;

            return res.json({
                success: true,
                message: `Sold at +${lossPct.toFixed(2)}% | Profit: $${profit.toFixed(2)}`,
                profit,
                profitPct: lossPct,
                position
            });
        }

        // ✅ Stop Loss: -2%
        if (lossPct <= stopLossPct) {
            const order = await client.order({
                symbol: 'BTCUSDT',
                side: 'SELL',
                type: 'MARKET',
                quantity: activePosition.qty
            });

            const soldValue = currentPrice * activePosition.qty;
            const profit = soldValue - activePosition.invested;

            console.log(`⚠️ STOP-LOSS: Sold at ${lossPct.toFixed(2)}% | Loss: $${profit.toFixed(2)}`);
            const position = { ...activePosition };
            activePosition = null;

            return res.json({
                success: true,
                message: `STOP-LOSS: Sold at ${lossPct.toFixed(2)}% | Loss: $${profit.toFixed(2)}`,
                profit,
                profitPct: lossPct,
                position
            });
        }

        // Still waiting
        return res.json({
            success: false,
            message: `Waiting: ${lossPct.toFixed(2)}% (need +4% or -2%)`
        });

    } catch (error) {
        console.error('Sell error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ✅ Get current status
exports.status = (req, res) => {
    res.json({ activePosition });
};