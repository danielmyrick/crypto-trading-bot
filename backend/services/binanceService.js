// backend/services/binanceService.js
const axios = require('axios');

async function getPrices() {
    try {
        // Get BTC price from Binance.us
        const btcRes = await axios.get('https://api.binance.us/api/v3/ticker/price', {
            params: { symbol: 'BTCUSDT' },
            timeout: 10000
        });

        const btcPrice = parseFloat(btcRes.data.price);

        // Fallback for other coins via CoinGecko
        const cgRes = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'ethereum,solana,binancecoin,xrp',
                vs_currencies: 'usd'
            },
            headers: { 'User-Agent': 'CryptoBot/1.0' },
            timeout: 10000
        });

        const data = cgRes.data;

        return {
            'BTC/USDT': { price: btcPrice, change: 'N/A' },
            'ETH/USDT': { price: data.ethereum?.usd || 0, change: 'N/A' },
            'SOL/USDT': { price: data.solana?.usd || 0, change: 'N/A' },
            'BNB/USDT': { price: data.binancecoin?.usd || 0, change: 'N/A' },
            'XRP/USDT': { price: data.xrp?.usd || 0, change: 'N/A' }
        };
    } catch (error) {
        console.error('❌ Price fetch failed:', error.message);
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