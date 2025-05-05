document.addEventListener('DOMContentLoaded', function() {

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // --- Sample Currency Data (Replace with your actual data source/API call) ---
    const currencies = [
        // Add MANY more entries here, including icons paths
        { code: 'CASH_EUR', name: 'CASH EUR', icon: 'icons/cash_eur.png', type: 'eur', reserve: null, min: 3000, max: 100000 },
        { code: 'CASH_USD', name: 'CASH USD', icon: 'icons/cash_usd.png', type: 'usd', reserve: null, min: 3000, max: 100000 },
        { code: 'CASH_RUB', name: 'CASH RUB', icon: 'icons/cash_rub.png', type: 'rub', reserve: null, min: 100000, max: 5000000 },
        { code: 'USDT_TRC20', name: 'Tether TRC-20 USDT', icon: 'icons/usdt_trc20.png', type: 'usd', reserve: 148654, min: 50, max: 50000 },
        { code: 'USDT_ERC20', name: 'Tether ERC-20 USDT', icon: 'icons/usdt_erc20.png', type: 'usd', reserve: 137675, min: 500, max: 50000 },
        { code: 'USDT_BEP20', name: 'Tether BEP-20 USDT', icon: 'icons/usdt_bep20.png', type: 'usd', reserve: 1061930, min: 50, max: 50000 },
        { code: 'KORONAPAY_USD', name: 'koronapay USD', icon: 'icons/koronapay.png', type: 'usd', reserve: null, min: 100, max: 5000 },
        { code: 'KORONAPAY_RUB', name: 'koronapay RUB', icon: 'icons/koronapay.png', type: 'rub', reserve: null, min: 10000, max: 300000 },
        { code: 'USDC_ERC20', name: 'USDC ERC-20 USDC', icon: 'icons/usdc_erc20.png', type: 'usd', reserve: 98749889, min: 500, max: 100000 },
        { code: 'USDC_BEP20', name: 'USDC BEP-20 USDC', icon: 'icons/usdc_bep20.png', type: 'usd', reserve: 513320, min: 50, max: 50000 },
        { code: 'TON', name: 'Toncoin TON', icon: 'icons/ton.png', type: 'crypto', reserve: 2343320, min: 10, max: 10000 },
        { code: 'BTC', name: 'Bitcoin BTC', icon: 'icons/btc.png', type: 'crypto', reserve: 50, min: 0.001, max: 5 },
        { code: 'ETH', name: 'Ethereum ETH', icon: 'icons/eth.png', type: 'crypto', reserve: 500, min: 0.01, max: 100 },
        // ... Add all your other currencies here
    ];

    // --- Exchange Form Elements ---
    const sendAmountInput = document.getElementById('send-amount-input');
    const receiveAmountInput = document.getElementById('receive-amount-input');
    const sendCurrencyList = document.getElementById('send-currency-list');
    const receiveCurrencyList = document.getElementById('receive-currency-list');
    const sendCurrencySymbol = document.getElementById('send-currency-symbol');
    const receiveCurrencySymbol = document.getElementById('receive-currency-symbol');
    const sendCurrencyIconEl = document.getElementById('send-currency-icon'); // Renamed from send-currency-icon
    const receiveCurrencyIconEl = document.getElementById('receive-currency-icon'); // Renamed from receive-currency-icon
    const sendHiddenInput = document.getElementById('send_currency_hidden');
    const receiveHiddenInput = document.getElementById('receive_currency_hidden');
    const sendColumn = document.getElementById('send-column');
    const receiveColumn = document.getElementById('receive-column');
    const sendSearchInput = sendColumn.querySelector('.search-input');
    const receiveSearchInput = receiveColumn.querySelector('.search-input');
    const sendFilterButtons = sendColumn.querySelectorAll('.filter-btn');
    const receiveFilterButtons = receiveColumn.querySelectorAll('.filter-btn');
    const swapButton = document.getElementById('swap-button');
    const exchangeRateDisplay = document.getElementById('exchange-rate-display');
    const sendLimitInfo = document.getElementById('send-limit-info');
    const receiveReserveInfo = document.getElementById('receive-reserve-info');


    // --- Binance API ---
    const binanceApiBase = 'https://api.binance.com/api/v3/ticker/price';
    const priceCache = {};
    const CACHE_DURATION = 15000; // 15 seconds

    // --- Initialization ---
    populateCurrencyList(sendCurrencyList, currencies, 'send');
    populateCurrencyList(receiveCurrencyList, currencies, 'receive');
    setupEventListeners();
    // Set initial selected states based on hidden inputs
    selectInitialCurrency(sendCurrencyList, sendHiddenInput.value);
    selectInitialCurrency(receiveCurrencyList, receiveHiddenInput.value);
    updateExchangeCalculation(); // Initial calculation


    // --- Functions ---

    /**
     * Populates a currency list container with items.
     * @param {HTMLElement} listElement - The container element (e.g., sendCurrencyList).
     * @param {Array} currencyData - The array of currency objects.
     * @param {string} type - 'send' or 'receive'.
     */
    function populateCurrencyList(listElement, currencyData, type) {
        listElement.innerHTML = ''; // Clear loading/previous items
        if (!currencyData || currencyData.length === 0) {
            listElement.innerHTML = '<div class="list-loading">Нет доступных валют.</div>';
            return;
        }

        currencyData.forEach(currency => {
            const item = document.createElement('button'); // Use button for better accessibility
            item.type = 'button'; // Prevent form submission
            item.className = 'currency-item';
            item.setAttribute('data-code', currency.code);
            item.setAttribute('data-name', currency.name.toLowerCase()); // For searching
            item.setAttribute('data-type', currency.type.toLowerCase()); // For filtering
            item.setAttribute('data-icon', currency.icon);
            item.setAttribute('data-symbol', getCurrencySymbol(currency.code)); // Store symbol

            // Store min/max/reserve data
            if (currency.min !== null && currency.min !== undefined) item.setAttribute('data-min', currency.min);
            if (currency.max !== null && currency.max !== undefined) item.setAttribute('data-max', currency.max);
            if (currency.reserve !== null && currency.reserve !== undefined) item.setAttribute('data-reserve', currency.reserve);


            const icon = document.createElement('img');
            icon.className = 'item-icon';
            icon.src = currency.icon || 'icons/placeholder.png'; // Provide a default placeholder
            icon.alt = currency.code;
            icon.loading = 'lazy'; // Lazy load icons

            const info = document.createElement('div');
            info.className = 'item-info';

            const name = document.createElement('span');
            name.className = 'item-name';
            name.textContent = currency.name;
            info.appendChild(name);

            // Add reserve info only to the receive list if available
            if (type === 'receive' && currency.reserve !== null && currency.reserve !== undefined) {
                const reserve = document.createElement('span');
                reserve.className = 'item-reserve';
                // Format reserve nicely
                reserve.textContent = `${parseFloat(currency.reserve).toLocaleString('ru-RU')} ${currency.code.split('_')[0] || currency.code}`;
                info.appendChild(reserve);
            }

            const checkmark = document.createElement('i');
            checkmark.className = 'fas fa-check-circle item-checkmark'; // Font Awesome checkmark

            item.appendChild(icon);
            item.appendChild(info);
            item.appendChild(checkmark);

            listElement.appendChild(item);
        });
    }

    /**
     * Sets up all necessary event listeners.
     */
    function setupEventListeners() {
        // Selection listeners
        sendCurrencyList.addEventListener('click', handleCurrencySelection);
        receiveCurrencyList.addEventListener('click', handleCurrencySelection);

        // Search listeners
        sendSearchInput.addEventListener('input', handleSearch);
        receiveSearchInput.addEventListener('input', handleSearch);

        // Filter listeners
        sendFilterButtons.forEach(btn => btn.addEventListener('click', handleFilter));
        receiveFilterButtons.forEach(btn => btn.addEventListener('click', handleFilter));

        // Amount input listener
        sendAmountInput.addEventListener('input', updateExchangeCalculation);

        // Swap listener
        if (swapButton) {
            swapButton.addEventListener('click', swapCurrencies);
        }
    }

     /**
      * Gets the common currency symbol.
      * @param {string} code - The currency code (e.g., CASH_EUR, USDT_TRC20).
      * @returns {string} The symbol (e.g., €, $).
      */
     function getCurrencySymbol(code) {
        const upperCode = code.toUpperCase();
        if (upperCode.includes('EUR')) return '€';
        if (upperCode.includes('USD') || upperCode.includes('USDT') || upperCode.includes('USDC')) return '$';
        if (upperCode.includes('RUB')) return '₽';
        if (upperCode.includes('BTC')) return '₿';
        if (upperCode.includes('ETH')) return 'Ξ';
        if (upperCode.includes('TON')) return '💎'; // Example for TON
        // Add more symbols as needed
        return ''; // Default or fallback
     }

    /**
     * Handles clicking on a currency item.
     * @param {Event} event - The click event.
     */
    function handleCurrencySelection(event) {
        const item = event.target.closest('.currency-item');
        if (!item) return; // Click wasn't on an item

        const listContainer = item.closest('.currency-list');
        const column = listContainer.closest('.currency-column');
        const isSendColumn = column.id === 'send-column';

        // Remove selected class from previously selected item in the same list
        const currentlySelected = listContainer.querySelector('.currency-item.selected');
        if (currentlySelected) {
            currentlySelected.classList.remove('selected');
        }

        // Add selected class to the clicked item
        item.classList.add('selected');

        // Update hidden input, displayed symbol, icon, and limits/reserves
        const code = item.getAttribute('data-code');
        const symbol = item.getAttribute('data-symbol');
        const iconSrc = item.getAttribute('data-icon');


        if (isSendColumn) {
            sendHiddenInput.value = code;
            sendCurrencySymbol.textContent = symbol;
            sendCurrencyIconEl.src = iconSrc;
            const min = item.getAttribute('data-min');
            const max = item.getAttribute('data-max');
            sendLimitInfo.textContent = `Мин: ${min ?? 'N/A'} Макс: ${max ?? 'N/A'}`;

        } else {
            receiveHiddenInput.value = code;
            receiveCurrencySymbol.textContent = symbol;
            receiveCurrencyIconEl.src = iconSrc;
            const reserve = item.getAttribute('data-reserve');
            const reserveAmount = parseFloat(reserve);
             if (!isNaN(reserveAmount)) {
                // Format with spaces as thousands separators for Russian locale
                 receiveReserveInfo.textContent = `Резерв: ${reserveAmount.toLocaleString('ru-RU', {maximumFractionDigits: 4})}`;
             } else {
                 receiveReserveInfo.textContent = `Резерв: ---`;
             }
        }

        // Recalculate exchange rate
        updateExchangeCalculation();
    }

    /**
     * Handles input in the search field.
     * @param {Event} event - The input event.
     */
    function handleSearch(event) {
        const input = event.target;
        const searchTerm = input.value.toLowerCase().trim();
        const list = input.closest('.currency-selector').querySelector('.currency-list');
        const items = list.querySelectorAll('.currency-item');

        items.forEach(item => {
            const name = item.getAttribute('data-name'); // Use stored lowercase name
            const isVisible = name.includes(searchTerm);
            item.style.display = isVisible ? 'flex' : 'none';
        });
    }

    /**
     * Handles clicking on a filter button.
     * @param {Event} event - The click event.
     */
    function handleFilter(event) {
        const button = event.target;
        const filter = button.getAttribute('data-filter').toLowerCase();
        const buttonContainer = button.parentElement;
        const list = button.closest('.currency-selector').querySelector('.currency-list');
        const items = list.querySelectorAll('.currency-item');

        // Update active button style
        buttonContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Filter items
        items.forEach(item => {
            const type = item.getAttribute('data-type');
            const isVisible = (filter === 'all' || type === filter);
            item.style.display = isVisible ? 'flex' : 'none';
        });

        // Clear search when filter changes
        const searchInput = button.closest('.currency-selector').querySelector('.search-input');
        if (searchInput) searchInput.value = '';
    }


     /**
     * Sets the initially selected currency based on the hidden input value.
      * @param {HTMLElement} listElement - The currency list container.
      * @param {string} initialCode - The currency code to select.
      */
     function selectInitialCurrency(listElement, initialCode) {
         const items = listElement.querySelectorAll('.currency-item');
         let found = false;
         items.forEach(item => {
             if (item.getAttribute('data-code') === initialCode) {
                 item.classList.add('selected');
                 // Also update the symbol and icon next to the amount input
                 const column = listElement.closest('.currency-column');
                 const isSendColumn = column.id === 'send-column';
                 const symbol = item.getAttribute('data-symbol');
                 const iconSrc = item.getAttribute('data-icon');

                 if (isSendColumn) {
                     sendCurrencySymbol.textContent = symbol;
                     sendCurrencyIconEl.src = iconSrc;
                     const min = item.getAttribute('data-min');
                     const max = item.getAttribute('data-max');
                     sendLimitInfo.textContent = `Мин: ${min ?? 'N/A'} Макс: ${max ?? 'N/A'}`;
                 } else {
                     receiveCurrencySymbol.textContent = symbol;
                     receiveCurrencyIconEl.src = iconSrc;
                     const reserve = item.getAttribute('data-reserve');
                     const reserveAmount = parseFloat(reserve);
                     if (!isNaN(reserveAmount)) {
                        receiveReserveInfo.textContent = `Резерв: ${reserveAmount.toLocaleString('ru-RU', {maximumFractionDigits: 4})}`;
                     } else {
                         receiveReserveInfo.textContent = `Резерв: ---`;
                     }
                 }
                 found = true;
             } else {
                 item.classList.remove('selected');
             }
         });
         // If the initial code wasn't found (maybe data changed), select the first item
         if (!found && items.length > 0) {
             items[0].click(); // Simulate a click to select the first item
         }
     }

    /**
     * Swaps the selected currencies and recalculates.
     */
    function swapCurrencies() {
        const currentSendCode = sendHiddenInput.value;
        const currentReceiveCode = receiveHiddenInput.value;

        // Find the corresponding items in the *other* list
        const itemToSendInReceiveList = receiveCurrencyList.querySelector(`.currency-item[data-code="${currentSendCode}"]`);
        const itemToReceiveInSendList = sendCurrencyList.querySelector(`.currency-item[data-code="${currentReceiveCode}"]`);

        // Only swap if both corresponding items exist in the opposite lists
        if (itemToSendInReceiveList && itemToReceiveInSendList) {
            // Simulate clicks to trigger selection updates and recalculation
            itemToReceiveInSendList.click();
            itemToSendInReceiveList.click();
        } else {
            console.warn("Cannot swap: A selected currency is not available in the opposite list.");
            // Optional: Show a user message
            exchangeRateDisplay.textContent = 'Обмен этой пары невозможен';
        }
    }

    // --- Binance API Fetching & Calculation (Modified from previous) ---

    /**
     * Fetches price from Binance API (simplified, no inverse check here as findSymbol handles it)
     */
    async function getBinancePrice(symbol) {
        const now = Date.now();
        if (priceCache[symbol] && (now - priceCache[symbol].timestamp < CACHE_DURATION)) {
            console.log(`Using cached price for ${symbol}`);
            return priceCache[symbol].price;
        }
        console.log(`(API) Fetching price for ${symbol}...`);
        try {
            const response = await fetch(`${binanceApiBase}?symbol=${symbol}`);
            if (!response.ok) {
                console.error(`Binance API error for ${symbol}: ${response.status}`);
                return null;
            }
            const data = await response.json();
            const price = parseFloat(data.price);
            if (isNaN(price) || price <= 0) return null;
            priceCache[symbol] = { price: price, timestamp: now };
            return price;
        } catch (error) {
            console.error(`Network error fetching ${symbol}:`, error);
            return null;
        }
    }

    /**
      * Determines the Binance symbol and calculation direction.
      */
    async function findBinanceSymbolAndCalculation(send, receive) {
         // Only handle pairs likely on Binance Spot (Crypto/Stablecoin)
        const cryptoOrStable = ['BTC', 'ETH', 'USDT', 'USDC', 'BUSD', 'TON']; // Add more
        if (!cryptoOrStable.includes(send) || !cryptoOrStable.includes(receive)) {
            console.log(`Pair ${send}/${receive} likely not on Binance Spot API.`);
            return { symbol: null, price: null, calculation: null }; // Indicate not a direct Binance pair
        }

        const standardSymbol = `${send}${receive}`;
        const reversedSymbol = `${receive}${send}`;

        let price = await getBinancePrice(standardSymbol);
        if (price !== null) {
            return { symbol: standardSymbol, price: price, calculation: 'multiply' };
        }

        price = await getBinancePrice(reversedSymbol);
        if (price !== null) {
            return { symbol: reversedSymbol, price: price, calculation: 'divide' };
        }

        console.warn(`Could not find Binance price for ${standardSymbol} or ${reversedSymbol}`);
        return { symbol: null, price: null, calculation: null };
    }

    /**
     * Updates the receive amount and displayed rate based on inputs.
     */
    async function updateExchangeCalculation() {
        const sendCode = sendHiddenInput.value;
        const receiveCode = receiveHiddenInput.value;
        const sendAmount = parseFloat(sendAmountInput.value);

        // Clear outputs if input is invalid or currencies are the same
        if (isNaN(sendAmount) || sendAmount <= 0 || !sendCode || !receiveCode || sendCode === receiveCode) {
            receiveAmountInput.value = '';
            exchangeRateDisplay.textContent = 'Курс обмена: ---';
            return;
        }

        exchangeRateDisplay.textContent = 'Курс обмена: Расчет...';
        receiveAmountInput.value = '';

        // --- Attempt to get rate from Binance API ---
        const { symbol, price, calculation } = await findBinanceSymbolAndCalculation(sendCode, receiveCode);

        let finalRate = 0;
        let receiveAmount = 0;

        if (calculation && price) {
            // Rate found via Binance API
            if (calculation === 'multiply') {
                finalRate = price;
                receiveAmount = sendAmount * finalRate;
            } else { // divide
                 if (price === 0) {
                     exchangeRateDisplay.textContent = 'Курс обмена: Ошибка курса (0)';
                     return;
                 }
                finalRate = 1 / price;
                receiveAmount = sendAmount / price;
            }
             console.log(`Rate from Binance for ${symbol} (${calculation}): ${price}, Calculated Rate: ${finalRate}`);
        } else {
            // --- HANDLE NON-BINANCE PAIRS OR FAILED FETCH ---
            // This is where you'd implement your internal logic, call other APIs,
            // or use manually set rates for pairs like CASH EUR -> USDC.
            // For this example, we'll just show 'not available'.
            console.log(`No direct Binance rate found for ${sendCode} -> ${receiveCode}. Using fallback/placeholder.`);
            exchangeRateDisplay.textContent = 'Курс обмена: Недоступен для этой пары';
             // You might want to set a placeholder receive amount or keep it empty
            receiveAmountInput.value = ''; // Keep empty if rate unavailable
            return; // Stop further calculation if rate is unavailable
            // --- END Fallback ---
        }


        // --- Apply Your Exchange Fee/Markup ---
        const feePercentage = 0.015; // Example: 1.5% fee
        receiveAmount *= (1 - feePercentage);
        // Adjust displayed rate if needed: finalRate *= (1 - feePercentage);
        // --- End Fee/Markup ---

        // --- Format Output ---
        const cryptoDecimals = 8;
        const stablecoinDecimals = 2;
        const fiatDecimals = 2;

        let receiveDecimals = cryptoDecimals;
        if (['USDT', 'USDC', 'BUSD', 'DAI'].some(s => receiveCode.includes(s))) receiveDecimals = stablecoinDecimals;
        if (['CASH_EUR', 'CASH_USD', 'CASH_RUB', 'KORONAPAY_USD', 'KORONAPAY_RUB'].includes(receiveCode)) receiveDecimals = fiatDecimals; // Example

        let rateDecimals = receiveDecimals; // Start with receive decimals for rate display
        if (finalRate > 0 && finalRate < 0.01) rateDecimals = Math.max(rateDecimals, 6); // More precision for small rates
         if (finalRate > 10000) rateDecimals = 2; // Less precision for large rates


        receiveAmountInput.value = receiveAmount > 0 ? receiveAmount.toFixed(receiveDecimals) : '';
        exchangeRateDisplay.textContent = `Курс обмена: 1 ${sendCode.split('_')[0]} ≈ ${finalRate.toFixed(rateDecimals)} ${receiveCode.split('_')[0]}`;

    }

}); // End DOMContentLoaded
