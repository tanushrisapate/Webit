import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchBoxProps {
  mode: 'movie' | 'book';
  onSearch: (query: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ mode, onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all titles for autocompletion cache
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const endpoint = mode === 'movie' ? '/api/movies' : '/api/books';
        const response = await fetch(endpoint);
        if (response.ok) {
          const list = await response.json();
          setSuggestions(list);
        }
      } catch (err) {
        console.error('Error fetching autocomplete suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
    setQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
  }, [mode]);

  // Filter suggestions as user types
  useEffect(() => {
    if (!query.trim()) {
      setFiltered([]);
      return;
    }
    const term = query.toLowerCase();
    const matches = suggestions
      .filter((title) => title && title.toLowerCase().includes(term))
      .slice(0, 10); // Limit to top 10 suggestions
    setFiltered(matches);
  }, [query, suggestions]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filtered.length) {
        const selectedValue = filtered[selectedIndex];
        setQuery(selectedValue);
        onSearch(selectedValue);
        setShowDropdown(false);
      } else if (query.trim()) {
        onSearch(query);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center bg-zinc-900/60 border border-zinc-800 focus-within:border-zinc-700 rounded-2xl p-1 shadow-lg transition-all backdrop-blur-md">
        <span className="pl-4 text-zinc-500">
          <Search size={20} />
        </span>
        <input
          type="text"
          value={query}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Caching list..." : `Enter a ${mode === 'movie' ? 'movie' : 'book'} title...`}
          disabled={loading}
          className="w-full bg-transparent border-0 outline-none focus:ring-0 py-3.5 px-3 text-zinc-100 placeholder-zinc-650 text-lg"
        />
        <button
          onClick={() => {
            if (query.trim()) {
              onSearch(query);
              setShowDropdown(false);
            }
          }}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold px-6 py-2.5 rounded-xl shadow-md transition duration-200"
        >
          Search
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-40 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl max-h-80 overflow-y-auto">
          {filtered.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(item);
                onSearch(item);
                setShowDropdown(false);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full text-left px-5 py-3 text-sm text-zinc-300 border-b border-zinc-800/40 transition-colors last:border-b-0 ${
                idx === selectedIndex ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-850/40'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
