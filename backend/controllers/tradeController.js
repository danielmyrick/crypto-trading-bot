// backend/controllers/tradeController.js
const { Spot } = require('@binance/connector');

// Initialize Binance.us client
const client = new Spot(
    process.env.BINANCE_API_KEY,
    process.env.BINANCE_SECRET_KEY,
    { baseURL: 'https://api.binance.us' }
);

let activePosition = null;

// Buy BTC/USDT
exports.buy = async (req, res) => {
    const TRADE_SIZE = parseFloat(process.env.TRADE_SIZE || 35);

    if (activePosition) {
        return res.json({ success: false, message: 'Already in position' });
    }

    try {
        const ticker = await client.tickerPrice('BTCUSDT');
        const currentPrice = parseFloat(ticker.price);
        const qty = (TRADE_SIZE / currentPrice).toFixed(6); // Binance requires precision

        // ✅ REAL MARKET ORDER
        const order = await client.newOrder('BTCUSDT', 'BUY', 'MARKET', { quantity: qty });

        activePosition = {
            symbol: 'BTC/USDT',
            buyPrice: currentPrice,
            qty: parseFloat(order.executedQty),
            invested: TRADE_SIZE,
            orderId: order.orderId,
            boughtAt: new Date().toISOString()
        };

        console.log('✅ REAL BUY ORDER:', order);

        res.json({
            success: true,
            message: `Bought $${TRADE_SIZE} of BTC at $${currentPrice}`,
            position: activePosition
        });
    } catch (error) {
        console.error('❌ Buy error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Sell BTC/USDT
exports.sell = async (req, res) => {
    if (!activePosition) {
        return res.json({ success: false, message: 'No active position' });
    }

    try {
        const ticker = await client.tickerPrice('BTCUSDT');
        const currentPrice = parseFloat(ticker.price);
        const buyPrice = activePosition.buyPrice;
        const lossPct = ((currentPrice - buyPrice) / buyPrice) * 100;

        const takeProfitPct = parseFloat(process.env.TAKE_PROFIT_PCT || 4);
        const stopLossPct = -2;

        if (lossPct >= takeProfitPct || lossPct <= stopLossPct) {
            const qty = activePosition.qty.toFixed(6);

            // ✅ REAL MARKET SELL
            const order = await client.newOrder('BTCUSDT', 'SELL', 'MARKET', { quantity: qty });

            const soldValue = currentPrice * activePosition.qty;
            const profit = soldValue - activePosition.invested;

            console.log(`✅ REAL SELL ORDER: ${order}`);
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

        return res.json({ success: false, message: `Waiting: ${lossPct.toFixed(2)}%` });
    } catch (error) {
        console.error('❌ Sell error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Status
exports.status = (req, res) => {
    res.json({ activePosition });
};