document.addEventListener('DOMContentLoaded', function () {
    const balanceEl = document.getElementById('balance');
    const profitEl = document.getElementById('profit');
    const toggleBtn = document.getElementById('toggleBot');
    const pricesEl = document.getElementById('prices');
    const tradesEl = document.getElementById('trades');

    let tradeInterval;
    let botRunning = false;
    let currentBalance = parseFloat(localStorage.getItem('botBalance') || 109);
    let totalProfit = parseFloat(localStorage.getItem('botTotalProfit') || 0);

    function updateBalance() {
        if (typeof currentBalance !== 'number' || isNaN(currentBalance)) {
            currentBalance = 109;
        }
        balanceEl.textContent = currentBalance.toFixed(2);
        profitEl.textContent = `$${totalProfit.toFixed(2)}`;
        localStorage.setItem('botBalance', currentBalance);
        localStorage.setItem('botTotalProfit', totalProfit);
    }

    async function loadRealBalance() {
        try {
            const res = await fetch('/api/balance');
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.warn('Balance fetch failed: Not JSON', text);
                return;
            }
            const data = await res.json();
            if (data.usdt !== undefined) {
                currentBalance = data.usdt;
            }
        } catch (err) {
            console.warn('Using fallback balance after error:', err.message);
        }
        updateBalance();
    }

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

    async function loadPrices() {
        try {
            const res = await fetch('/api/market');
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.error('Price fetch failed: Not JSON', text);
                pricesEl.innerHTML = '<div>❌ Failed to load prices</div>';
                return;
            }
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

    toggleBtn.addEventListener('click', async () => {
        botRunning = !botRunning;
        toggleBtn.textContent = botRunning ? '⏹️ Stop Bot' : '▶️ Start Bot';
        toggleBtn.className = botRunning ? 'active' : 'inactive';

        if (botRunning) {
            alert('Bot started! Using $109 capital, $35/trade, 1% profit target.');

            tradeInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch('/api/status');
                    const contentType = statusRes.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await statusRes.text();
                        console.error('❌ Not JSON:', text);
                        return;
                    }

                    const status = await statusRes.json();

                    if (!status.activePosition) {
                        if (currentBalance >= 35) {
                            const buyRes = await fetch('/api/buy', { method: 'POST' });

                            if (!buyRes.headers.get('content-type')?.includes('application/json')) {
                                const text = await buyRes.text();
                                console.error('❌ Buy response not JSON:', text);
                                return;
                            }

                            const buyData = await buyRes.json();
                            if (buyData.success) {
                                currentBalance -= 35;
                                updateBalance();
                                logTrade('BUY', 'BTC/USDT', 35, '—');
                            }
                        }
                    } else {
                        const sellRes = await fetch('/api/sell', { method: 'POST' });

                        if (!sellRes.headers.get('content-type')?.includes('application/json')) {
                            const text = await sellRes.text();
                            console.error('❌ Sell response not JSON:', text);
                            return;
                        }

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

    // Initial load
    updateBalance();
    loadRealBalance();
    loadPrices();

    // Refresh every 30 seconds
    setInterval(loadRealBalance, 30000);
    setInterval(loadPrices, 30000);
});