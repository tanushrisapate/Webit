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

// API Base URL (Relative for deployment/production, fallback to localhost for development)
const API_BASE_URL = window.location.origin.startsWith('file') ? 'http://127.0.0.1:5050' : window.location.origin;

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
    recommendBtn.addEventListener('click', getRecommendations);
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
async function getRecommendations() {
    const queryVal = searchInput.value.trim();
    if (!queryVal) return;
    
    closeAutocomplete();
    showElement(loader);
    hideElement(errorBanner);
    hideElement(resultsSection);
    
    const endpoint = currentMode === 'movies' ? '/api/recommend/movie' : '/api/recommend/book';
    const payload = currentMode === 'movies' ? { movie: queryVal } : { book: queryVal };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
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
function displayResults(data) {
    recommendationsGrid.innerHTML = '';
    
    // Reset ambiguous header changes if any
    const resultsHeaderH2 = document.querySelector('.results-header h2');
    resultsHeaderH2.innerHTML = `Because you liked <span id="query-name" class="highlight">${data.query}</span>`;
    
    const badge = document.querySelector('.recommendation-badge');
    badge.textContent = 'Top 5 Recommendations';
    badge.style.background = 'rgba(16, 185, 129, 0.1)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    badge.style.color = 'var(--secondary-color)';
    
    data.recommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'rec-card glass';
        
        // Convert similarity fraction to percentage
        const similarityPct = Math.round(rec.similarity * 100);
        
        // Star ratings scaling details
        let ratingText = '';
        let iconHtml = '';
        
        if (currentMode === 'movies') {
            ratingText = `${rec.rating.toFixed(1)}/10`;
            iconHtml = '<i class="fa-solid fa-film"></i> Movie';
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="card-header-info">
                        <h3 class="card-title">${rec.title}</h3>
                        <span class="similarity-pct">${similarityPct}% match</span>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="rating-badge">
                        <i class="fa-solid fa-star"></i>
                        <span>${ratingText}</span>
                    </div>
                    <span class="media-tag">${iconHtml}</span>
                </div>
            `;
        } else {
            // Books
            ratingText = `${rec.rating.toFixed(1)}/5`;
            iconHtml = '<i class="fa-solid fa-book"></i> Book';
            
            card.innerHTML = `
                <div class="card-top">
                    <div class="card-header-info">
                        <h3 class="card-title">${rec.title}</h3>
                        <span class="similarity-pct">${similarityPct}% match</span>
                    </div>
                    <div class="metadata-label">
                        By <strong>${rec.authors}</strong><br>
                        <span style="font-size: 0.8rem; opacity: 0.7;">Publisher: ${rec.publisher || 'Unknown'}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="rating-badge">
                        <i class="fa-solid fa-star"></i>
                        <span>${ratingText}</span>
                    </div>
                    <span class="media-tag">${iconHtml}</span>
                </div>
            `;
        }
        
        recommendationsGrid.appendChild(card);
    });
    
    showElement(resultsSection);
    
    // Smooth scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render ambiguous results picker
function displayAmbiguousMatches(data) {
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
        card.className = 'rec-card glass';
        
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
        `;
        
        // Add event listener to Select button
        const selectBtn = card.querySelector('.select-match-btn');
        selectBtn.addEventListener('click', () => {
            searchInput.value = match.title;
            getRecommendations();
        });
        
        recommendationsGrid.appendChild(card);
    });
    
    showElement(resultsSection);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
