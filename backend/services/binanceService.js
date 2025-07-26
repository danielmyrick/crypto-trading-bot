// backend/services/binanceService.js
const axios = require('axios');

// Fetch real prices from Binance.us
async function getPrices() {
    try {
        const response = await axios.get('https://api.binance.us/api/v3/ticker/price', {
            params: { symbol: 'BTCUSDT' },
            timeout: 10000
        });

        const btcPrice = parseFloat(response.data.price);

        // Get other prices from CoinGecko (free fallback)
        const coingecko = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'ethereum,solana,binancecoin,xrp',
                vs_currencies: 'usd'
            },
            headers: { 'User-Agent': 'CryptoBot/1.0' },
            timeout: 10000
        });

        const data = coingecko.data;

        return {
            'BTC/USDT': { price: btcPrice, change: 'N/A' },
            'ETH/USDT': { price: data.ethereum?.usd || 0, change: 'N/A' },
            'SOL/USDT': { price: data.solana?.usd || 0, change: 'N/A' },
            'BNB/USDT': { price: data.binancecoin?.usd || 0, change: 'N/A' },
            'XRP/USDT': { price: data.xrp?.usd || 0, change: 'N/A' }
        };
    } catch (error) {
        console.error('❌ Price fetch failed:', error.message);
        // Fallback prices
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