document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const balanceEl = document.getElementById('balance');
    const profitEl = document.getElementById('profit');
    const toggleBtn = document.getElementById('toggleBot');
    const pricesEl = document.getElementById('prices');
    const tradesEl = document.getElementById('trades');

    // Debug
    console.log('Elements:', { balanceEl, profitEl, toggleBtn, pricesEl, tradesEl });
    if (!toggleBtn) {
        console.error('❌ #toggleBot not found! Check HTML');
        alert('Dashboard failed to load. Refresh and check console.');
        return;
    }

    // State
    let tradeInterval;
    let botRunning = false;
    let currentBalance = parseFloat(localStorage.getItem('botBalance') || 109);
    let totalProfit = parseFloat(localStorage.getItem('botTotalProfit') || 0);

    // Update balance
    function updateBalance() {
        balanceEl.textContent = currentBalance.toFixed(2);
        profitEl.textContent = `$${totalProfit.toFixed(2)}`;
    }
    // ✅ Load real balance from Binance.us
    async function loadRealBalance() {
        try {
            const res = await fetch('/api/balance');
            const data = await res.json();

            // Update global balance
            currentBalance = data.usdt;
            updateBalance(); // Update UI

            console.log('✅ Real balance loaded:', data);
        } catch (err) {
            console.error('Failed to load real balance:', err);
            // Fallback to localStorage if API fails
            currentBalance = parseFloat(localStorage.getItem('botBalance') || 109);
            updateBalance();
        }
    }

    // Load on start and every 30 seconds
    loadRealBalance();
    setInterval(loadRealBalance, 30000);
    // Log trade
    function logTrade(type, pair, amount, pl) {
        const trade = document.createElement('div');
        trade.className = 'trade';
        trade.innerHTML = `
      <span>${new Date().toLocaleTimeString()}</span>
      <span>${pair}</span>
      <span>${type}</span>
      <span class="${pl.includes('-') ? 'loss' : 'profit'}">${pl}</span>
    `;
        tradesEl.prepend(trade);
        if (tradesEl.children.length > 10) {
            tradesEl.removeChild(tradesEl.lastChild);
        }
    }

    // Initialize
    updateBalance();

    // Load prices
    async function loadPrices() {
        try {
            const res = await fetch('/api/market');
            const data = await res.json();
            pricesEl.innerHTML = '';
            Object.entries(data).forEach(([pair, info]) => {
                const item = document.createElement('div');
                item.className = 'price-item';
                item.innerHTML = `
          <strong>${pair}</strong>
          <span>$${info.price.toLocaleString()}</span>
          <span class="${info.change?.startsWith('+') ? 'price-up' : 'price-down'}">${info.change}</span>
        `;
                pricesEl.appendChild(item);
            });
        } catch (err) {
            console.error('Failed to load prices:', err);
            pricesEl.innerHTML = '<div>❌ Failed to load prices</div>';
        }
    }

    // Start/Stop Bot
    toggleBtn.addEventListener('click', async () => {
        botRunning = !botRunning;
        toggleBtn.textContent = botRunning ? '⏹️ Stop Bot' : '▶️ Start Bot';
        toggleBtn.className = botRunning ? 'active' : 'inactive';

        if (botRunning) {
            alert('Bot started! Using $109 capital, $35/trade, 4% profit target.');

            tradeInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch('/api/status');
                    const status = await statusRes.json();

                    if (!status.activePosition) {
                        if (currentBalance >= 35) {
                            const buyRes = await fetch('/api/buy', { method: 'POST' });
                            const buyData = await buyRes.json();
                            if (buyData.success) {
                                currentBalance -= 35;
                                updateBalance();
                                logTrade('BUY', 'BTC/USDT', 35, '—');
                            }
                        }
                    } else {
                        const sellRes = await fetch('/api/sell', { method: 'POST' });
                        const sellData = await sellRes.json();
                        if (sellData.success && sellData.profit) {
                            const profit = sellData.profit;
                            currentBalance += 35 + profit;
                            totalProfit += profit;
                            updateBalance();
                            logTrade('SELL', 'BTC/USDT', 35 + profit, `+$${profit.toFixed(2)}`);
                        }
                    }
                } catch (err) {
                    console.error('Auto-trade error:', err);
                }
            }, 30000);
        } else {
            clearInterval(tradeInterval);
            alert('Bot stopped.');
        }
    });

    // Load prices
    loadPrices();
    setInterval(loadPrices, 30000);
});