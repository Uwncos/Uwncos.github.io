document.addEventListener('DOMContentLoaded', function() {

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            // document.body.classList.toggle('menu-open'); // Optional
        });
    }

    // --- Exchange Form Elements ---
    const sendAmountInput = document.getElementById('send-amount-input');
    const receiveAmountInput = document.getElementById('receive-amount-input');
    const sendCurrencySelect = document.getElementById('send-currency-select');
    const receiveCurrencySelect = document.getElementById('receive-currency-select');
    const sendCurrencyIcon = document.getElementById('send-currency-icon');
    const receiveCurrencyIcon = document.getElementById('receive-currency-icon');
    const swapButton = document.getElementById('swap-button');
    const exchangeRateDisplay = document.getElementById('exchange-rate-display');
    // Placeholder: Add elements for reserve/limit display if needed
    // const sendLimitInfo = document.getElementById('send-limit-info');
    // const receiveReserveInfo = document.getElementById('receive-reserve-info');

    const binanceApiBase = 'https://api.binance.com/api/v3/ticker/price';
    const priceCache = {}; // Simple cache { 'SYMBOL': { price: number, timestamp: number } }
    const CACHE_DURATION = 15000; // Cache price for 15 seconds

    // --- Helper Functions ---

    /**
     * Fetches price from cache or Binance API.
     * @param {string} symbol - The Binance symbol (e.g., BTCUSDT).
     * @returns {Promise<number|null>} The price or null if error.
     */
    async function getPrice(symbol) {
        const now = Date.now();
        if (priceCache[symbol] && (now - priceCache[symbol].timestamp < CACHE_DURATION)) {
            console.log(`Using cached price for ${symbol}`);
            return priceCache[symbol].price;
        }

        console.log(`Fetching price for ${symbol}...`);
        try {
            const response = await fetch(`${binanceApiBase}?symbol=${symbol}`);
            if (!response.ok) {
                console.error(`Binance API error for ${symbol}: ${response.status}`);
                // If symbol invalid, response often has code -1121
                // const errorData = await response.json().catch(() => ({})); // Try to get error code
                // console.error("Error data:", errorData);
                return null; // Symbol likely invalid or other API issue
            }
            const data = await response.json();
            const price = parseFloat(data.price);

            if (isNaN(price) || price <= 0) {
                console.error(`Invalid price received for ${symbol}:`, data.price);
                return null;
            }

            // Update cache
            priceCache[symbol] = { price: price, timestamp: now };
            return price;
        } catch (error) {
            console.error(`Network error fetching Binance price for ${symbol}:`, error);
            exchangeRateDisplay.textContent = 'Курс обмена: Ошибка сети'; // Network error feedback
            return null;
        }
    }

    /**
     * Determines the correct Binance symbol and calculation direction.
     * Returns { symbol: string|null, calculation: 'multiply'|'divide'|null }
     */
    async function findSymbolAndCalculation(send, receive) {
        const standardSymbol = `${send}${receive}`;
        const reversedSymbol = `${receive}${send}`;

        // Try standard direction first (e.g., BTCUSDT)
        let price = await getPrice(standardSymbol);
        if (price !== null) {
            // Found SENDRECEIVE pair (e.g., BTCUSDT). 1 SEND = price RECEIVE
            return { symbol: standardSymbol, price: price, calculation: 'multiply' };
        }

        // Try reversed direction (e.g., USDTETH - API might list ETHUSDT)
        price = await getPrice(reversedSymbol);
        if (price !== null) {
             // Found RECEIVESEND pair (e.g., ETHUSDT). 1 RECEIVE = price SEND
             // So, 1 SEND = 1/price RECEIVE
            return { symbol: reversedSymbol, price: price, calculation: 'divide' };
        }

        // Could not find a direct pair
        console.warn(`Could not find price for ${standardSymbol} or ${reversedSymbol}`);
        return { symbol: null, price: null, calculation: null };
    }

    /**
     * Updates the receive amount and displayed rate based on inputs.
     */
    async function updateExchangeCalculation() {
        const sendCurrency = sendCurrencySelect.value;
        const receiveCurrency = receiveCurrencySelect.value;
        const sendAmount = parseFloat(sendAmountInput.value);

        // Clear outputs if input is invalid or currencies are the same
        if (isNaN(sendAmount) || sendAmount <= 0 || !sendCurrency || !receiveCurrency || sendCurrency === receiveCurrency) {
            receiveAmountInput.value = '';
            exchangeRateDisplay.textContent = 'Курс обмена: ---';
            return;
        }

        // Update Currency Icons (using data-icon attribute)
        try {
            const sendOption = sendCurrencySelect.options[sendCurrencySelect.selectedIndex];
            const receiveOption = receiveCurrencySelect.options[receiveCurrencySelect.selectedIndex];
            sendCurrencyIcon.src = sendOption.getAttribute('data-icon') || 'placeholder-icon.png';
            receiveCurrencyIcon.src = receiveOption.getAttribute('data-icon') || 'placeholder-icon.png';
            sendCurrencyIcon.alt = sendCurrency;
            receiveCurrencyIcon.alt = receiveCurrency;
        } catch (e) { console.error("Error updating icons:", e)}


        exchangeRateDisplay.textContent = 'Курс обмена: Загрузка...';
        receiveAmountInput.value = ''; // Clear while loading

        // Find the correct API symbol and how to use its price
        const { symbol, price, calculation } = await findSymbolAndCalculation(sendCurrency, receiveCurrency);

        if (calculation === null || price === null) {
            exchangeRateDisplay.textContent = 'Курс обмена: Пара недоступна';
            return;
        }

        let rateForDisplay = 0;
        let receiveAmount = 0;

        // Perform calculation based on the direction found
        if (calculation === 'multiply') {
            // We fetched SENDRECEIVE (e.g., BTCUSDT)
            // 1 SEND costs `price` RECEIVE
            rateForDisplay = price;
            receiveAmount = sendAmount * price;
        } else { // calculation === 'divide'
            // We fetched RECEIVESEND (e.g., ETHUSDT, but want USDT -> ETH)
            // 1 RECEIVE costs `price` SEND.
            // So, 1 SEND buys `1/price` RECEIVE
            if (price === 0) { // Avoid division by zero
                 exchangeRateDisplay.textContent = 'Курс обмена: Ошибка курса (0)';
                 return;
            }
            rateForDisplay = 1 / price;
            receiveAmount = sendAmount / price; // Equivalent to sendAmount * (1/price)
        }

        // --- Apply Your Exchange Fee/Markup ---
        const feePercentage = 0.01; // Example: 1% fee
        receiveAmount *= (1 - feePercentage);
        // Adjust the displayed rate ONLY if you want the user to see the rate *after* your fee
        // rateForDisplay *= (1 - feePercentage);
        // --- End Fee/Markup ---

        // --- Format Output ---
        // Determine appropriate decimal places (simple example)
        const cryptoDecimals = 8;
        const stablecoinDecimals = 2;
        let receiveDecimals = cryptoDecimals;
        if (['USDT', 'USDC', 'BUSD', 'DAI'].includes(receiveCurrency)) { // Add other stables
            receiveDecimals = stablecoinDecimals;
        }
        let rateDecimals = cryptoDecimals;
         if (['USDT', 'USDC', 'BUSD', 'DAI'].includes(receiveCurrency)) {
            rateDecimals = stablecoinDecimals;
         }
         // If the rate is very small, show more decimals
         if (rateForDisplay > 0 && rateForDisplay < 0.01) {
             rateDecimals = Math.max(rateDecimals, 6);
         }


        receiveAmountInput.value = receiveAmount > 0 ? receiveAmount.toFixed(receiveDecimals) : '';
        exchangeRateDisplay.textContent = `Курс обмена: 1 ${sendCurrency} ≈ ${rateForDisplay.toFixed(rateDecimals)} ${receiveCurrency}`;

        // Placeholder: Update limits/reserves if you have that data
        // sendLimitInfo.textContent = `Мин: ... ${sendCurrency} | Макс: ... ${sendCurrency}`;
        // receiveReserveInfo.textContent = `Резерв: ... ${receiveCurrency}`;
    }

    /**
     * Swaps the selected currencies and recalculates.
     */
    function swapCurrencies() {
        const currentSendValue = sendCurrencySelect.value;
        const currentReceiveValue = receiveCurrencySelect.value;

        // Check if the swap is valid (if the options exist in both selects)
        const sendHasReceive = [...sendCurrencySelect.options].some(opt => opt.value === currentReceiveValue);
        const receiveHasSend = [...receiveCurrencySelect.options].some(opt => opt.value === currentSendValue);

        if (sendHasReceive && receiveHasSend) {
            sendCurrencySelect.value = currentReceiveValue;
            receiveCurrencySelect.value = currentSendValue;

            // Also swap amounts for a more intuitive feel, if desired
            const sendAmount = sendAmountInput.value;
            // const receiveAmount = receiveAmountInput.value; // Use this if you want to swap displayed values
            sendAmountInput.value = ''; // Or clear send amount after swap
            receiveAmountInput.value = ''; // Clear receive amount

            updateExchangeCalculation(); // Recalculate
        } else {
            console.warn("Cannot swap: One currency not available in the other list.");
            // Optional: Show a user-friendly message
            // exchangeRateDisplay.textContent = "Обмен невозможен для этой пары";
        }
    }

    // --- Attach Event Listeners ---
    if (sendAmountInput && receiveAmountInput && sendCurrencySelect && receiveCurrencySelect && exchangeRateDisplay && sendCurrencyIcon && receiveCurrencyIcon) {
        sendAmountInput.addEventListener('input', updateExchangeCalculation);
        sendCurrencySelect.addEventListener('change', updateExchangeCalculation);
        receiveCurrencySelect.addEventListener('change', updateExchangeCalculation);
        if (swapButton) {
            swapButton.addEventListener('click', swapCurrencies);
        }

        // Initial calculation on page load
        updateExchangeCalculation();

        // Optional: Refresh calculation periodically (e.g., every 15 seconds)
        // Consider rate limits if refreshing very frequently
        // setInterval(updateExchangeCalculation, 15000);

    } else {
        console.error("CRITICAL: One or more exchange form elements not found! Calculation disabled.");
        if(exchangeRateDisplay) exchangeRateDisplay.textContent = "Ошибка: Форма обмена неисправна.";
    }

}); // End DOMContentLoaded
