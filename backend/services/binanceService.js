// backend/services/binanceService.js
const axios = require('axios');

async function getPrices() {
    try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
        const promises = symbols.map(symbol =>
            axios.get('https://api.binance.us/api/v3/ticker/price', {
                params: { symbol },
                timeout: 10000
            })
        );

        const responses = await Promise.all(promises);
        const data = responses.map(res => res.data);

        return {
            'BTC/USDT': { price: parseFloat(data[0].price), change: 'N/A' },
            'ETH/USDT': { price: parseFloat(data[1].price), change: 'N/A' },
            'SOL/USDT': { price: parseFloat(data[2].price), change: 'N/A' },
            'BNB/USDT': { price: parseFloat(data[3].price), change: 'N/A' },
            'XRP/USDT': { price: parseFloat(data[4].price), change: 'N/A' }
        };
    } catch (error) {
        console.error('❌ Binance.us fetch failed:', error.message);
        return {
            'BTC/USDT': { price: 60000, change: 'N/A' },
            'ETH/USDT': { price: 3000, change: 'N/A' },
            'SOL/USDT': { price: 150, change: 'N/A' },
            'BNB/USDT': { price: 400, change: 'N/A' },
            'XRP/USDT': { price: 0.5, change: 'N/A' }
        };
    }
}

module.exports = { getPrices };