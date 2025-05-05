document.addEventListener('DOMContentLoaded', function() {

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            // Optional: Toggle body class to prevent scroll
            // document.body.classList.toggle('menu-open');
        });
    }

    // --- Exchange Form Logic ---
    const sendAmountInput = document.getElementById('send-amount-input');
    const receiveAmountInput = document.getElementById('receive-amount-input');
    const sendCurrencySelect = document.getElementById('send-currency-select');
    const receiveCurrencySelect = document.getElementById('receive-currency-select');
    const sendCurrencyIcon = document.getElementById('send-currency-icon');
    const receiveCurrencyIcon = document.getElementById('receive-currency-icon');
    const swapButton = document.getElementById('swap-button');
    const exchangeRateDisplay = document.getElementById('exchange-rate-display');

    const binanceApiBase = 'https://api.binance.com/api/v3/ticker/price';

    // Function to fetch price from Binance API
    async function fetchBinancePrice(symbol) {
        // Simple cache to avoid hitting API too often for the *exact* same symbol quickly
        const cacheKey = `price_${symbol}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        const now = Date.now();

        if (cachedData) {
            const { price, timestamp } = JSON.parse(cachedData);
            // Use cache if less than 10 seconds old
            if (now - timestamp < 10000) {
                console.log(`Using cached price for ${symbol}`);
                return parseFloat(price);
            }
        }

        console.log(`Fetching price for ${symbol}...`);
        try {
            const response = await fetch(`${binanceApiBase}?symbol=${symbol}`);
            if (!response.ok) {
                // Handle cases where the pair might not exist directly (e.g., SBERRUB)
                // or other API errors
                console.error(`Binance API error for ${symbol}: ${response.status}`);
                 // Try fetching inverse pair if applicable (basic example)
                 if (symbol.includes('USDT') && !symbol.startsWith('USDT')) {
                     const base = symbol.replace('USDT','');
                     const inverseSymbol = `USDT${base}`;
                     console.log(`Trying inverse symbol: ${inverseSymbol}`)
                     const invResponse = await fetch(`${binanceApiBase}?symbol=${inverseSymbol}`);
                     if(invResponse.ok) {
                         const invData = await invResponse.json();
                         const invPrice = parseFloat(invData.price);
                          if (invPrice > 0) {
                              const price = 1 / invPrice;
                               sessionStorage.setItem(cacheKey, JSON.stringify({ price: price, timestamp: now }));
                              return price;
                          }
                     }
                 }
                return null; // Indicate failure
            }
            const data = await response.json();
            const price = parseFloat(data.price);
            // Cache the result
            sessionStorage.setItem(cacheKey, JSON.stringify({ price: price, timestamp: now }));
            return price;
        } catch (error) {
            console.error('Network error fetching Binance price:', error);
            return null; // Indicate failure
        }
    }

    // Function to determine the correct Binance symbol and calculation direction
    function getSymbolAndDirection(sendCurrency, receiveCurrency) {
        // Prioritize standard pairs (e.g., BTCUSDT, ETHBTC)
        const standardSymbol = `${sendCurrency}${receiveCurrency}`;
        const reversedSymbol = `${receiveCurrency}${sendCurrency}`;
        const supportedPairs = ["BTCUSDT", "ETHUSDT", "ETHBTC", "BNBBTC", "BNBUSDT"]; // Add more known pairs

        if (supportedPairs.includes(standardSymbol)) {
            return { symbol: standardSymbol, direction: 'standard' }; // Multiply by rate
        } else if (supportedPairs.includes(reversedSymbol)) {
            return { symbol: reversedSymbol, direction: 'reversed' }; // Divide by rate
        }
        // Add specific logic for Fiat or less common pairs if needed
        // e.g., if receiveCurrency is 'SBERRUB' and send is 'USDT'
        // else if (sendCurrency === 'USDT' && receiveCurrency === 'SBERRUB') {
        //     return { symbol: 'USDTRUB', direction: 'standard' }; // Assuming API provides USDTRUB
        // }

        // Fallback: Try the standard combination, API might support it
        console.warn(`Pair ${standardSymbol} or ${reversedSymbol} not explicitly listed. Trying ${standardSymbol}.`);
        return { symbol: standardSymbol, direction: 'standard' };
    }


    // Function to update the receive amount and rate display
    async function updateCalculation() {
        const sendCurrency = sendCurrencySelect.value;
        const receiveCurrency = receiveCurrencySelect.value;
        const sendAmount = parseFloat(sendAmountInput.value);

        if (isNaN(sendAmount) || sendAmount <= 0 || !sendCurrency || !receiveCurrency || sendCurrency === receiveCurrency) {
            receiveAmountInput.value = '';
            exchangeRateDisplay.textContent = 'Курс обмена: ---';
            return;
        }

        // Update Icons
        const sendOption = sendCurrencySelect.options[sendCurrencySelect.selectedIndex];
        const receiveOption = receiveCurrencySelect.options[receiveCurrencySelect.selectedIndex];
        sendCurrencyIcon.src = sendOption.getAttribute('data-icon') || 'placeholder-icon.png';
        receiveCurrencyIcon.src = receiveOption.getAttribute('data-icon') || 'placeholder-icon.png';
        sendCurrencyIcon.alt = sendCurrency;
        receiveCurrencyIcon.alt = receiveCurrency;


        exchangeRateDisplay.textContent = 'Курс обмена: Загрузка...';
        receiveAmountInput.value = ''; // Clear while loading

        const { symbol, direction } = getSymbolAndDirection(sendCurrency, receiveCurrency);

        if (!symbol) {
             exchangeRateDisplay.textContent = 'Курс обмена: Пара не поддерживается';
             return;
        }

        const price = await fetchBinancePrice(symbol);

        if (price === null || price <= 0) {
            exchangeRateDisplay.textContent = 'Курс обмена: Ошибка получения курса';
            receiveAmountInput.value = '';
            return;
        }

        let calculatedRate = 0;
        let receiveAmount = 0;

        // --- Basic Calculation (No Fee/Markup) ---
        if (direction === 'standard') {
            calculatedRate = price; // 1 Send = Price Receive
            receiveAmount = sendAmount * calculatedRate;
        } else { // reversed
            calculatedRate = 1 / price; // 1 Send = (1/Price) Receive
            receiveAmount = sendAmount * calculatedRate;
            // OR: receiveAmount = sendAmount / price; // If thinking as 1 Receive = Price Send
        }
        // --- END Basic Calculation ---

        // --- ADD YOUR EXCHANGE FEE/MARKUP LOGIC HERE ---
        // Example: Add a 1% fee
        const feePercentage = 0.01; // 1%
        receiveAmount = receiveAmount * (1 - feePercentage);
        // Update the displayed rate to reflect the fee if desired
        // calculatedRate = calculatedRate * (1 - feePercentage);
        // --- END FEE LOGIC ---


        // Format the output (adjust decimal places based on currency)
        let decimals = 8; // Default crypto
        if (['USDT', 'USD', 'EUR', 'RUB'].includes(receiveCurrency)) decimals = 2; // Fiat or stablecoin
        // Add more rules if needed
        receiveAmountInput.value = receiveAmount > 0 ? receiveAmount.toFixed(decimals) : '';

        exchangeRateDisplay.textContent = `Курс обмена: 1 ${sendCurrency} ≈ ${calculatedRate.toFixed(decimals)} ${receiveCurrency}`;
    }

    // Function to swap currencies
    function swapCurrencies() {
        const sendVal = sendCurrencySelect.value;
        const receiveVal = receiveCurrencySelect.value;

        // Check if the current receive value exists in the send options and vice-versa
        const sendHasReceive = [...sendCurrencySelect.options].some(opt => opt.value === receiveVal);
        const receiveHasSend = [...receiveCurrencySelect.options].some(opt => opt.value === sendVal);

        if (sendHasReceive && receiveHasSend) {
            sendCurrencySelect.value = receiveVal;
            receiveCurrencySelect.value = sendVal;
            updateCalculation(); // Recalculate after swap
        } else {
            console.warn("Cannot swap: currencies not available in both lists.");
            // Optionally show a message to the user
        }
    }


    // --- Event Listeners ---
    if (sendAmountInput && receiveAmountInput && sendCurrencySelect && receiveCurrencySelect && exchangeRateDisplay) {
        sendAmountInput.addEventListener('input', updateCalculation);
        sendCurrencySelect.addEventListener('change', updateCalculation);
        receiveCurrencySelect.addEventListener('change', updateCalculation);
        if(swapButton) {
            swapButton.addEventListener('click', swapCurrencies);
        }


        // Initial calculation on page load
        updateCalculation();

        // Refresh calculation periodically (e.g., every 15 seconds)
        setInterval(updateCalculation, 15000);
    } else {
        console.error("One or more exchange form elements not found!");
    }

});
