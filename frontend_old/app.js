// Application State
let currentMode = 'movies'; // 'movies' or 'books'
let moviesList = [];
let booksList = [];

// DOM Elements
const searchInput = document.getElementById('search-input');
const autocompleteList = document.getElementById('autocomplete-list');
const clearBtn = document.getElementById('clear-btn');
const recommendBtn = document.getElementById('recommend-btn');
const loader = document.getElementById('loader');
const errorBanner = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const resultsSection = document.getElementById('results-section');
const queryName = document.getElementById('query-name');
const recommendationsGrid = document.getElementById('recommendations-grid');

const movieTab = document.getElementById('movie-tab');
const bookTab = document.getElementById('book-tab');

const API_BASE_URL = (window.location.origin && window.location.origin.startsWith('http')) 
    ? window.location.origin 
    : 'http://127.0.0.1:5050';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadAutocompleteData();
    
    // Set up event listeners
    setUpEventListeners();
});

// Event Listeners Setup
function setUpEventListeners() {
    // Mode switcher
    movieTab.addEventListener('click', () => switchMode('movies'));
    bookTab.addEventListener('click', () => switchMode('books'));
    
    // Autocomplete logic
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleKeyNavigation);
    
    // Close suggestions click outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== autocompleteList) {
            closeAutocomplete();
        }
    });
    
    // Clear search button
    clearBtn.addEventListener('click', clearSearch);
    
    // Recommend trigger
    recommendBtn.addEventListener('click', () => getRecommendations());
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            getRecommendations();
        }
    });
}

// Switch between Movies and Books
function switchMode(mode) {
    if (currentMode === mode) return;
    
    currentMode = mode;
    
    // Toggle active state in UI
    if (mode === 'movies') {
        movieTab.classList.add('active');
        bookTab.classList.remove('active');
        searchInput.placeholder = "Type a movie you love (e.g. The Dark Knight)...";
    } else {
        bookTab.classList.add('active');
        movieTab.classList.remove('active');
        searchInput.placeholder = "Type a book you love (e.g. Harry Potter)...";
    }
    
    // Reset inputs and results
    clearSearch();
    hideElement(resultsSection);
    hideElement(errorBanner);
    
    // Preload autocomplete data for the mode if empty
    loadAutocompleteData();
}

// Load Autocomplete Data from Backend
async function loadAutocompleteData() {
    const listToLoad = currentMode === 'movies' ? moviesList : booksList;
    if (listToLoad.length > 0) return; // Already loaded
    
    const endpoint = currentMode === 'movies' ? '/api/movies' : '/api/books';
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (currentMode === 'movies') {
            moviesList = data;
        } else {
            booksList = data;
        }
        console.log(`Loaded ${data.length} autocomplete entries for ${currentMode}.`);
    } catch (error) {
        console.error(`Failed to load autocomplete data for ${currentMode}:`, error);
    }
}

// Handle keystrokes and display autocomplete items
function handleSearchInput() {
    const query = searchInput.value.trim().toLowerCase();
    
    // Toggle clear button
    if (searchInput.value.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
    
    if (!query || query.length < 2) {
        closeAutocomplete();
        return;
    }
    
    const sourceList = currentMode === 'movies' ? moviesList : booksList;
    const filteredList = sourceList.filter(item => 
        item.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to top 10 matches
    
    renderAutocomplete(filteredList);
}

// Render Autocomplete Dropdown
function renderAutocomplete(items) {
    if (items.length === 0) {
        closeAutocomplete();
        return;
    }
    
    autocompleteList.innerHTML = '';
    autocompleteList.classList.remove('hidden');
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.textContent = item;
        div.addEventListener('click', () => {
            searchInput.value = item;
            closeAutocomplete();
            clearBtn.classList.remove('hidden');
        });
        autocompleteList.appendChild(div);
    });
}

// Close Autocomplete dropdown
function closeAutocomplete() {
    autocompleteList.classList.add('hidden');
    autocompleteList.innerHTML = '';
}

// Handle basic key operations (Escape to close dropdown)
function handleKeyNavigation(e) {
    if (e.key === 'Escape') {
        closeAutocomplete();
    }
}

// Clear Search Input
function clearSearch() {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    closeAutocomplete();
}

// Show/Hide Helpers
function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

// Generate recommendations cards based on API response
async function getRecommendations(itemId = null) {
    // If called via event listener or other contexts, ignore the Event object parameter
    if (itemId && typeof itemId === 'object') {
        itemId = null;
    }
    const queryVal = searchInput.value.trim();
    if (!queryVal) return;
    
    closeAutocomplete();
    showElement(loader);
    hideElement(errorBanner);
    hideElement(resultsSection);
    
    const endpoint = currentMode === 'movies' ? '/api/recommend/movie' : '/api/recommend/book';
    
    let payload = {};
    if (currentMode === 'movies') {
        payload = { movie: queryVal };
        if (itemId !== null) payload.id = itemId;
    } else {
        payload = { book: queryVal };
        if (itemId !== null) payload.id = itemId;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        let data = {};
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { error: text || `HTTP Error ${response.status}` };
        }
        
        hideElement(loader);
        
        if (!response.ok) {
            showError(data.error || 'Server error occurred.');
            return;
        }
        
        if (data.ambiguous) {
            displayAmbiguousMatches(data);
        } else {
            displayResults(data);
        }
        
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        hideElement(loader);
        showError('Network error. Make sure the backend server is running.');
    }
}

// Display error messages
function showError(message) {
    errorText.textContent = message;
    showElement(errorBanner);
    hideElement(resultsSection);
}

// Render recommendations
async function displayResults(data) {
    recommendationsGrid.innerHTML = '';
    
    // Reset ambiguous header changes if any
    const resultsHeaderH2 = document.querySelector('.results-header h2');
    resultsHeaderH2.innerHTML = `Because you liked <span id="query-name" class="highlight">${data.query}</span>`;
    
    const badge = document.querySelector('.recommendation-badge');
    badge.textContent = 'Top 5 Recommendations';
    badge.style.background = 'rgba(16, 185, 129, 0.1)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    badge.style.color = 'var(--secondary-color)';
    
    const cardPromises = data.recommendations.map(async (rec) => {
        const card = document.createElement('div');
        card.className = 'rec-card glass image-card';
        
        // Convert similarity fraction to percentage
        const similarityPct = Math.round(rec.similarity * 100);
        
        // Star ratings scaling details
        let ratingText = '';
        let iconHtml = '';
        let metaHtml = '';
        
        if (currentMode === 'movies') {
            ratingText = `${rec.rating.toFixed(1)}/10`;
            iconHtml = '<i class="fa-solid fa-film"></i> Movie';
            metaHtml = `
                <div class="watch-providers" id="watch-${rec.id}">
                    <span style="font-size: 0.75rem; opacity: 0.5;">Checking streaming...</span>
                </div>
            `;
        } else {
            ratingText = `${rec.rating.toFixed(1)}/5`;
            iconHtml = '<i class="fa-solid fa-book"></i> Book';
            metaHtml = `
                <div class="metadata-label">
                    By <strong>${rec.authors}</strong><br>
                    <span style="font-size: 0.8rem; opacity: 0.7;">Publisher: ${rec.publisher || 'Unknown'}</span>
                </div>
                <div class="watch-providers" style="margin-top: 8px;">
                    <a href="https://www.goodreads.com/search?q=${encodeURIComponent(rec.title)}" target="_blank" class="watch-link">
                        <i class="fa-solid fa-book-open"></i> Find on Goodreads
                    </a>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="card-image-container shimmer">
                <span class="similarity-pct">${similarityPct}% match</span>
                <img class="card-poster" src="" alt="${rec.title}" style="display: none;">
            </div>
            <div class="card-content">
                <div class="card-top">
                    <div class="card-header-info">
                        <h3 class="card-title">${rec.title}</h3>
                    </div>
                    ${metaHtml}
                </div>
                <div class="card-footer">
                    <div class="rating-badge">
                        <i class="fa-solid fa-star"></i>
                        <span>${ratingText}</span>
                    </div>
                    <span class="media-tag">${iconHtml}</span>
                </div>
            </div>
        `;
        
        recommendationsGrid.appendChild(card);
        
        // Load cover/poster asynchronously
        getPosterOrCoverUrl(rec.title, currentMode, rec.isbn).then(imageUrl => {
            const img = card.querySelector('.card-poster');
            const imgContainer = card.querySelector('.card-image-container');
            if (img) {
                img.src = imageUrl;
                img.onload = () => {
                    imgContainer.classList.remove('shimmer');
                    img.style.display = 'block';
                };
                img.onerror = () => {
                    const fallbackUrl = currentMode === 'movies'
                        ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'
                        : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80';
                    img.src = fallbackUrl;
                    imgContainer.classList.remove('shimmer');
                    img.style.display = 'block';
                };
            }
        });

        // Load streaming providers asynchronously if it's a movie
        if (currentMode === 'movies') {
            getStreamingProviders(rec.title).then(providers => {
                const watchContainer = card.querySelector(`#watch-${rec.id}`);
                if (watchContainer) {
                    watchContainer.innerHTML = '';
                    if (providers && providers.length > 0) {
                        providers.forEach(p => {
                            const a = document.createElement('a');
                            a.href = p.url;
                            a.target = '_blank';
                            a.className = `watch-link ${p.isFlatrate ? 'flatrate' : ''}`;
                            a.innerHTML = `<i class="fa-solid fa-circle-play"></i> Watch on ${p.name}`;
                            watchContainer.appendChild(a);
                        });
                    } else {
                        // Show not available message
                        watchContainer.innerHTML = `
                            <span style="font-size: 0.75rem; opacity: 0.4;">Not available on local streaming platforms</span>
                        `;
                    }
                }
            });
        }
    });
    
    showElement(resultsSection);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    await Promise.all(cardPromises);
}

// Render ambiguous results picker
async function displayAmbiguousMatches(data) {
    recommendationsGrid.innerHTML = '';
    
    // Customize header for ambiguity choice
    const resultsHeaderH2 = document.querySelector('.results-header h2');
    resultsHeaderH2.innerHTML = `Multiple matches found for <span id="query-name" class="highlight">${data.query}</span>`;
    
    const badge = document.querySelector('.recommendation-badge');
    badge.textContent = 'Which one did you mean?';
    badge.style.background = 'rgba(239, 68, 68, 0.1)';
    badge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    badge.style.color = '#f87171';
    
    data.matches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'rec-card glass image-card';
        
        let metaHtml = '';
        let typeIcon = '';
        if (currentMode === 'books') {
            metaHtml = `By <strong>${match.authors}</strong><br><span style="font-size: 0.85rem; opacity: 0.7;">Publisher: ${match.publisher || 'Unknown'}</span><br><span style="font-size: 0.85rem; opacity: 0.7;">Rating: ${match.rating.toFixed(2)}/5</span>`;
            typeIcon = '<i class="fa-solid fa-book"></i> Book';
        } else {
            metaHtml = `Rating: <strong>${match.rating.toFixed(1)}/10</strong>`;
            typeIcon = '<i class="fa-solid fa-film"></i> Movie';
        }
        
        card.innerHTML = `
            <div class="card-image-container shimmer">
                <img class="card-poster" src="" alt="${match.title}" style="display: none;">
            </div>
            <div class="card-content">
                <div class="card-top">
                    <div class="card-header-info" style="margin-bottom: 12px;">
                        <h3 class="card-title" style="font-size: 1.15rem;">${match.title}</h3>
                    </div>
                    <div class="metadata-label">
                        ${metaHtml}
                    </div>
                </div>
                <div class="card-footer" style="justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 12px; margin-top: 15px;">
                    <span class="media-tag">${typeIcon}</span>
                    <button class="btn btn-primary select-match-btn" data-title="${match.title}" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 8px;">
                        Select
                    </button>
                </div>
            </div>
        `;
        
        recommendationsGrid.appendChild(card);
        
        // Load cover/poster asynchronously
        getPosterOrCoverUrl(match.title, currentMode, match.isbn).then(imageUrl => {
            const img = card.querySelector('.card-poster');
            const imgContainer = card.querySelector('.card-image-container');
            if (img) {
                img.src = imageUrl;
                img.onload = () => {
                    imgContainer.classList.remove('shimmer');
                    img.style.display = 'block';
                };
                img.onerror = () => {
                    const fallbackUrl = currentMode === 'movies'
                        ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'
                        : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80';
                    img.src = fallbackUrl;
                    imgContainer.classList.remove('shimmer');
                    img.style.display = 'block';
                };
            }
        });
        
        // Add event listener to Select button
        const selectBtn = card.querySelector('.select-match-btn');
        selectBtn.addEventListener('click', () => {
            searchInput.value = match.title;
            getRecommendations(match.id);
        });
    });
    
    showElement(resultsSection);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Fetch poster or book cover URL dynamically using free public APIs
async function getPosterOrCoverUrl(title, type, isbn) {
    if (type === 'books' && isbn && isbn.trim() !== "" && isbn !== 'nan') {
        const cleanedIsbn = isbn.trim();
        return `https://covers.openlibrary.org/b/isbn/${cleanedIsbn}-M.jpg`;
    }
    
    // Fallback: Wikipedia Page Images API
    try {
        const queryTitle = type === 'movies' ? `${title} (film)` : title;
        const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&pilicense=any&generator=search&gsrsearch=${encodeURIComponent(queryTitle)}&gsrlimit=1&piprop=thumbnail&pithumbsize=300`);
        if (response.ok) {
            const data = await response.json();
            if (data.query && data.query.pages) {
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                if (pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
                    return pages[pageId].thumbnail.source;
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch image from Wikipedia:", e);
    }
    
    // Unsplash High-quality Placeholders if API limits or page images are missing
    if (type === 'movies') {
        return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
    } else {
        return 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80';
    }
}

// Fetch streaming providers for a movie title via FM-DB API
async function getStreamingProviders(title) {
    try {
        const response = await fetch(`https://imdb.iamidiotareyoutoo.com/justwatch?q=${encodeURIComponent(title)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.description && data.description.length > 0) {
                // Find matching movie using exact or loose title matching (never fall back to unrelated first index)
                const movieMatch = data.description.find(m => m.title.toLowerCase() === title.toLowerCase()) || 
                                   data.description.find(m => m.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(m.title.toLowerCase()));
                
                if (movieMatch && movieMatch.offers && movieMatch.offers.length > 0) {
                    const providers = [];
                    const seenNames = new Set();
                    
                    // Filter offers into flatrate (streaming subscription), rent, and buy
                    const flatrateOffers = movieMatch.offers.filter(o => o.type.startsWith('FLATRATE'));
                    const otherOffers = movieMatch.offers.filter(o => !o.type.startsWith('FLATRATE'));
                    const sortedOffers = [...flatrateOffers, ...otherOffers];
                    
                    for (const offer of sortedOffers) {
                        const providerName = offer.name;
                        // Strict check to ensure we only link to direct OTT destinations and never JustWatch redirects
                        if (offer.url && !offer.url.includes('justwatch.com')) {
                            if (!seenNames.has(providerName)) {
                                seenNames.add(providerName);
                                providers.push({
                                    name: providerName,
                                    url: offer.url,
                                    isFlatrate: offer.type.startsWith('FLATRATE')
                                });
                            }
                        }
                        if (providers.length >= 2) break; // Limit to top 2 providers to fit the card layout cleanly
                    }
                    return providers;
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch JustWatch streaming data:", e);
    }
    return null;
}
