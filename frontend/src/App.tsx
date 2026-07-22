import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBox } from './components/SearchBox';
import { RecommendationCard } from './components/RecommendationCard';
import { Watchlist } from './components/Watchlist';
import { AuthModal } from './components/AuthModal';
import { AlertCircle, Heart, HelpCircle, Loader2 } from 'lucide-react';

interface RecommendationItem {
  id: number;
  title: string;
  rating: number;
  similarity: number;
  authors?: string;
  publisher?: string;
  isbn?: string;
}

interface WatchlistItem {
  id: number;
  item_type: 'movie' | 'book';
  item_id: number;
  title: string;
  added_at: string;
}

interface AmbiguousMatch {
  id: number;
  title: string;
  authors?: string;
  publisher?: string;
  rating: number;
  isbn?: string;
}

function App() {
  const [mode, setMode] = useState<'movie' | 'book'>('movie');
  const [activeTab, setActiveTab] = useState<'home' | 'watchlist'>('home');
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  
  // Ambiguity resolver state
  const [ambiguousMatches, setAmbiguousMatches] = useState<AmbiguousMatch[]>([]);
  const [ambiguousQuery, setAmbiguousQuery] = useState('');

  // Watchlist cache state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // Authenticate session on load
  useEffect(() => {
    const savedToken = localStorage.getItem('webit_token');
    const savedUser = localStorage.getItem('webit_username');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsername(savedUser);
      fetchWatchlist(savedToken);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem('webit_token', newToken);
    localStorage.setItem('webit_username', newUsername);
    fetchWatchlist(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    setWatchlist([]);
    localStorage.removeItem('webit_token');
    localStorage.removeItem('webit_username');
    setActiveTab('home');
  };

  const fetchWatchlist = async (authToken: string) => {
    try {
      const response = await fetch('/api/watchlist', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    }
  };

  const handleToggleWatchlist = async (item: RecommendationItem) => {
    if (!token) return;

    const isSaved = watchlist.some(
      (w) => w.item_type === mode && w.item_id === item.id
    );

    const endpoint = isSaved ? '/api/watchlist/remove' : '/api/watchlist/add';
    const body = isSaved 
      ? { item_type: mode, item_id: item.id }
      : { item_type: mode, item_id: item.id, title: item.title };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        fetchWatchlist(token);
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
    }
  };

  const handleRemoveFromWatchlist = async (type: 'movie' | 'book', id: number) => {
    if (!token) return;
    try {
      const response = await fetch('/api/watchlist/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ item_type: type, item_id: id }),
      });

      if (response.ok) {
        fetchWatchlist(token);
      }
    } catch (err) {
      console.error('Error removing from watchlist:', err);
    }
  };

  const executeSearch = async (searchQuery: string, itemId?: number) => {
    setLoading(true);
    setError('');
    setRecommendations([]);
    setAmbiguousMatches([]);
    setQuery(searchQuery);

    const url = mode === 'movie' ? '/api/recommend/movie' : '/api/recommend/book';
    const body = itemId !== undefined 
      ? { id: itemId } 
      : (mode === 'movie' ? { movie: searchQuery } : { book: searchQuery });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Failed to fetch recommendations.`);
      }

      if (data.ambiguous) {
        setAmbiguousMatches(data.matches);
        setAmbiguousQuery(data.query);
      } else {
        setRecommendations(data.recommendations);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check your query.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAmbiguousMatch = (match: AmbiguousMatch) => {
    setAmbiguousMatches([]);
    executeSearch(match.title, match.id);
  };

  const handleWatchlistSearch = (type: 'movie' | 'book', title: string) => {
    setMode(type);
    setActiveTab('home');
    executeSearch(title);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        mode={mode}
        setMode={setMode}
        username={username}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12">
        {activeTab === 'home' ? (
          <div className="space-y-12">
            {/* Header section */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Discover your next favorite {mode === 'movie' ? 'movie' : 'book'}
              </h2>
              <p className="text-zinc-500 text-sm md:text-base">
                Enter a title you love and our hybrid filtering engine will suggest 5 related matches.
              </p>
            </div>

            {/* Search Input */}
            <SearchBox mode={mode} onSearch={(q) => executeSearch(q)} />

            {/* Loading Indicator */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 size={32} className="animate-spin text-zinc-400" />
                <span className="text-zinc-500 text-xs">Computing similarities...</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 bg-red-950/20 border border-red-900/30 p-5 rounded-xl max-w-2xl mx-auto text-red-200 text-sm">
                <AlertCircle size={20} className="flex-shrink-0 text-red-400" />
                <p>{error}</p>
              </div>
            )}

            {/* Ambiguity Resolver Grid */}
            {!loading && ambiguousMatches.length > 0 && (
              <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl max-w-3xl mx-auto space-y-6 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <HelpCircle size={20} className="text-zinc-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-zinc-250">Ambiguous Matches Found</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      We found multiple {mode === 'movie' ? 'movies' : 'books'} containing "<strong>{ambiguousQuery}</strong>". Please select the correct one:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {ambiguousMatches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => handleSelectAmbiguousMatch(match)}
                      className="text-left bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl p-4 transition-all duration-200"
                    >
                      <h4 className="font-bold text-zinc-150 truncate">{match.title}</h4>
                      {match.authors && (
                        <p className="text-xs text-zinc-400 truncate mt-1">By {match.authors}</p>
                      )}
                      {match.publisher && (
                        <p className="text-[10px] text-zinc-500 truncate">Publisher: {match.publisher}</p>
                      )}
                      <div className="text-[10px] text-amber-500 mt-2 font-medium">
                        Rating: {match.rating.toFixed(1)} ★
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Output */}
            {!loading && recommendations.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-300 border-l-2 border-zinc-400 pl-3 uppercase tracking-wider">
                    Recommendations for <span className="text-white italic">"{query}"</span>
                  </h3>
                  <span className="text-[10px] text-zinc-600 bg-zinc-900 border border-zinc-850 px-3 py-1 rounded-full font-medium">
                    {recommendations.length} results
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                  {recommendations.map((item) => {
                    const isSaved = watchlist.some(
                      (w) => w.item_type === mode && w.item_id === item.id
                    );
                    return (
                      <RecommendationCard
                        key={item.id}
                        item={item}
                        type={mode}
                        isSaved={isSaved}
                        isLoggedIn={!!token}
                        onToggleWatchlist={() => handleToggleWatchlist(item)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Watchlist View */
          <div className="space-y-6">
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Heart size={22} className="text-zinc-400" />
                My Watchlist
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Keep track of your saved movies and books.</p>
            </div>
            <Watchlist
              items={watchlist}
              onRemove={handleRemoveFromWatchlist}
              onSearchItem={handleWatchlistSearch}
            />
          </div>
        )}
      </main>

      <footer className="bg-zinc-950 border-t border-zinc-900 py-8 text-center text-zinc-650 text-[10px]">
        <p>© {new Date().getFullYear()} Webit. All rights reserved.</p>
        <p className="mt-1">Built with FastAPI, React, and Cosine Similarity algorithms.</p>
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;
