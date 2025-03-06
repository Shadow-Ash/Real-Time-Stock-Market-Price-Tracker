// Constants
const API_KEY = '8EES4ER9A8UJQYLN';
const CACHE_DURATION = 60000; // 1 minute
const TOP_STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'WMT', name: 'Walmart Inc.' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'MA', name: 'Mastercard Inc.' },
    { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
    { symbol: 'HD', name: 'Home Depot Inc.' },
    { symbol: 'BAC', name: 'Bank of America Corp.' },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
    { symbol: 'CVX', name: 'Chevron Corporation' },
    { symbol: 'ABBV', name: 'AbbVie Inc.' },
    { symbol: 'PFE', name: 'Pfizer Inc.' },
    { symbol: 'AVGO', name: 'Broadcom Inc.' },
    { symbol: 'COST', name: 'Costco Wholesale Corp.' },
    { symbol: 'DIS', name: 'The Walt Disney Co.' },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
    { symbol: 'VZ', name: 'Verizon Communications' },
    { symbol: 'CMCSA', name: 'Comcast Corporation' },
    { symbol: 'ADBE', name: 'Adobe Inc.' },
    { symbol: 'ABT', name: 'Abbott Laboratories' },
    { symbol: 'TMO', name: 'Thermo Fisher Scientific' }
    // Added more top stocks for comprehensive coverage
];

// Cache management
const cache = new Map();
let currentCurrency = 'INR';
const exchangeRates = {
    USD: 1,
    INR: 83.12,
    EUR: 0.92
};

// DOM Elements
const stocksContainer = document.getElementById('stocks-container');
const watchlistContainer = document.getElementById('watchlist-container');
const searchInput = document.getElementById('stock-search');
const searchSuggestions = document.getElementById('search-suggestions');
const currencySelect = document.getElementById('currency-select');
const themeToggle = document.getElementById('theme-toggle');
const modal = document.getElementById('stock-modal');
const modalBody = document.getElementById('modal-body');
const loadingSpinner = document.getElementById('loading-spinner');

// Initialize theme from localStorage
document.body.classList.toggle('dark-mode', localStorage.getItem('theme') === 'dark');
themeToggle.checked = localStorage.getItem('theme') === 'dark';

// Event Listeners
document.querySelectorAll('.nav-links li').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Hide all pages and show the selected one
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`${link.dataset.page}-page`).classList.add('active');

        // Clear search input and suggestions when switching pages
        if (link.dataset.page !== 'home') {
            searchInput.value = '';
            searchSuggestions.style.display = 'none';
            stocksContainer.innerHTML = '';
        }

        // Update watchlist if on watchlist page
        if (link.dataset.page === 'watchlist') {
            updateWatchlistView();
        }
    });
});

themeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
});

currencySelect.addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    updateAllPrices();
});

// Enhanced search functionality
let searchTimeout;
searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim().toUpperCase();
    clearTimeout(searchTimeout);

    if (query.length < 1) {
        searchSuggestions.style.display = 'none';
        stocksContainer.innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            showLoading();
            const filteredStocks = TOP_STOCKS.filter(stock =>
                stock.symbol.includes(query) ||
                stock.name.toUpperCase().includes(query)
            );

            const suggestions = filteredStocks
                .map(stock => `
                    <div class="suggestion" data-symbol="${stock.symbol}" data-name="${stock.name}">
                        <strong>${stock.symbol}</strong> - ${stock.name}
                    </div>
                `)
                .join('');

            searchSuggestions.innerHTML = suggestions;
            searchSuggestions.style.display = suggestions ? 'block' : 'none';

            // Add click handlers to suggestions
            document.querySelectorAll('.suggestion').forEach(suggestion => {
                suggestion.addEventListener('click', async () => {
                    const symbol = suggestion.dataset.symbol;
                    const name = suggestion.dataset.name;
                    searchSuggestions.style.display = 'none';
                    searchInput.value = `${symbol} - ${name}`;
                    await displayStock({ symbol, name });
                });
            });
            hideLoading();
        } catch (error) {
            hideLoading();
            showError('Search failed. Please try again.');
        }
    }, 300);
});

// Display single stock
async function displayStock(stock) {
    try {
        showLoading();
        const quoteData = await fetchStockData(stock.symbol);
        const stockCard = createStockCard(stock, quoteData);

        // Clear existing content
        stocksContainer.innerHTML = '';

        // Append the new stock card
        stocksContainer.appendChild(stockCard);
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(`Failed to load ${stock.symbol}: ${error.message}`);
    }
}

// API Functions
async function fetchStockData(symbol) {
    const cacheKey = `${symbol}_${currentCurrency}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    showLoading();
    try {
        const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`);
        const data = await response.json();

        if (data['Global Quote']) {
            cache.set(cacheKey, {
                timestamp: Date.now(),
                data: data['Global Quote']
            });
            hideLoading();
            return data['Global Quote'];
        }
        throw new Error(data['Note'] || 'Failed to fetch stock data');
    } catch (error) {
        hideLoading();
        throw error;
    }
}

async function fetchStockDetails(symbol) {
    showLoading();
    try {
        const [quote, dailyData] = await Promise.all([
            fetchStockData(symbol),
            fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`)
                .then(res => res.json())
        ]);
        hideLoading();
        return { quote, dailyData };
    } catch (error) {
        hideLoading();
        throw error;
    }
}

// UI Functions
function createStockCard(stock, quoteData) {
    const price = convertCurrency(parseFloat(quoteData['05. price']));
    const change = parseFloat(quoteData['09. change']);
    const changePercent = parseFloat(quoteData['10. change percent']);
    const volume = parseInt(quoteData['06. volume']).toLocaleString();

    const card = document.createElement('div');
    card.className = 'stock-card';
    card.innerHTML = `
        <div class="stock-header">
            <h3>${stock.name} (${stock.symbol})</h3>
            <button class="watchlist-btn" data-symbol="${stock.symbol}">
                ${isInWatchlist(stock.symbol) ? '★' : '☆'}
            </button>
        </div>
        <div class="stock-price">${formatCurrency(price)}</div>
        <div class="stock-change ${change >= 0 ? 'positive' : 'negative'}">
            ${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
        </div>
        <div class="stock-details">
            <div>Volume: ${volume}</div>
            <div>Last Updated: ${new Date().toLocaleTimeString()}</div>
        </div>
    `;

    // Add event listeners
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('watchlist-btn')) {
            showStockDetails(stock.symbol);
        }
    });

    card.querySelector('.watchlist-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWatchlist(stock);
        e.target.textContent = isInWatchlist(stock.symbol) ? '★' : '☆';
    });

    return card;
}

async function showStockDetails(symbol) {
    try {
        const { quote, dailyData } = await fetchStockDetails(symbol);
        const stock = TOP_STOCKS.find(s => s.symbol === symbol) || { name: symbol };

        modalBody.innerHTML = `
            <h2>${stock.name} (${symbol})</h2>
            <div class="stock-details">
                <div class="price-info">
                    <h3>Current Price: ${formatCurrency(convertCurrency(parseFloat(quote['05. price'])))}</h3>
                    <p>Volume: ${parseInt(quote['06. volume']).toLocaleString()}</p>
                    <p>Market Cap: ${calculateMarketCap(quote)}</p>
                </div>
                <div class="chart-container">
                    <select id="timeframeSelect" class="timeframe-select">
                        <option value="7">7 Days</option>
                        <option value="30">30 Days</option>
                    </select>
                    <canvas id="priceChart"></canvas>
                </div>
            </div>
        `;

        if (dailyData['Time Series (Daily)']) {
            const createChart = (days) => {
                const chartData = Object.entries(dailyData['Time Series (Daily)'])
                    .slice(0, days)
                    .reverse();

                new Chart(document.getElementById('priceChart'), {
                    type: 'line',
                    data: {
                        labels: chartData.map(([date]) => date),
                        datasets: [{
                            label: 'Stock Price',
                            data: chartData.map(([, data]) => convertCurrency(parseFloat(data['4. close']))),
                            borderColor: '#0d6efd',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: `${days}-Day Price History`
                            }
                        }
                    }
                });
            };

            createChart(7); // Default to 7 days

            // Add timeframe change handler
            document.getElementById('timeframeSelect').addEventListener('change', (e) => {
                const days = parseInt(e.target.value);
                createChart(days);
            });
        }

        modal.style.display = 'block';
    } catch (error) {
        showError(`Failed to load stock details: ${error.message}`);
    }
}

// Utility Functions
function convertCurrency(amount) {
    return amount * exchangeRates[currentCurrency];
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currentCurrency
    }).format(amount);
}

function calculateMarketCap(quote) {
    const price = parseFloat(quote['05. price']);
    const volume = parseInt(quote['06. volume']);
    const estimatedShares = volume * 100; // Rough estimation
    return formatCurrency(convertCurrency(price * estimatedShares));
}

function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Watchlist Management
function getWatchlist() {
    return JSON.parse(localStorage.getItem('watchlist') || '[]');
}

function isInWatchlist(symbol) {
    return getWatchlist().some(stock => stock.symbol === symbol);
}

function toggleWatchlist(stock) {
    const watchlist = getWatchlist();
    const index = watchlist.findIndex(s => s.symbol === stock.symbol);

    if (index === -1) {
        watchlist.push(stock);
    } else {
        watchlist.splice(index, 1);
    }

    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    updateWatchlistView();
}

// Update watchlist view
async function updateWatchlistView() {
    const watchlist = getWatchlist();
    watchlistContainer.innerHTML = '';

    if (watchlist.length === 0) {
        watchlistContainer.innerHTML = '<div class="no-stocks">No stocks in watchlist</div>';
        return;
    }

    for (const stock of watchlist) {
        try {
            const quoteData = await fetchStockData(stock.symbol);
            const stockCard = createStockCard(stock, quoteData);
            watchlistContainer.appendChild(stockCard);
        } catch (error) {
            showError(`Failed to load ${stock.symbol}: ${error.message}`);
        }
    }
}

async function updateAllPrices() {
    const stocks = [...TOP_STOCKS, ...getWatchlist()];
    for (const stock of stocks) {
        try {
            const quoteData = await fetchStockData(stock.symbol);
            const cards = document.querySelectorAll(`.stock-card[data-symbol="${stock.symbol}"]`);
            cards.forEach(card => {
                const priceElement = card.querySelector('.stock-price');
                priceElement.textContent = formatCurrency(convertCurrency(parseFloat(quoteData['05. price'])));
            });
        } catch (error) {
            console.error(`Failed to update ${stock.symbol}: ${error.message}`);
        }
    }
}


// Initialize
function initialize() {
    // Set initial theme
    document.body.classList.toggle('dark-mode', localStorage.getItem('theme') === 'dark');
    themeToggle.checked = localStorage.getItem('theme') === 'dark';

    // Clear search input and results
    searchInput.value = '';
    stocksContainer.innerHTML = '';
    searchSuggestions.style.display = 'none';

    // Load watchlist if on watchlist page
    if (document.querySelector('[data-page="watchlist"]').classList.contains('active')) {
        updateWatchlistView();
    }
}

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// Start the application
initialize();

// Periodic updates
setInterval(() => {
    updateAllPrices();
}, 60000); // Update every minute