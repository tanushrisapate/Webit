import React from 'react';
import { Film, BookOpen, LogIn, LogOut, Bookmark, Home } from 'lucide-react';

interface NavbarProps {
  mode: 'movie' | 'book';
  setMode: (mode: 'movie' | 'book') => void;
  username: string | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  activeTab: 'home' | 'watchlist';
  setActiveTab: (tab: 'home' | 'watchlist') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  setMode,
  username,
  onLogout,
  onOpenAuth,
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav className="sticky top-0 z-30 w-full bg-zinc-950/80 border-b border-zinc-900/80 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-100 font-bold text-xl">
            W
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-zinc-100 flex items-center gap-1.5">
              Webit <span className="text-[10px] bg-zinc-900 border border-zinc-800/80 text-zinc-400 font-medium px-2 py-0.5 rounded-full">v2.0</span>
            </h1>
            <p className="text-[10px] text-zinc-500">Hybrid AI Recommendation Engine</p>
          </div>
        </div>

        {/* Tab & Mode Switchers */}
        <div className="flex items-center gap-4">
          {/* Main Navigation */}
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/80 text-sm">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition font-medium ${
                activeTab === 'home'
                  ? 'bg-zinc-850 text-white border border-zinc-700/50 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Home size={15} />
              Home
            </button>
            {username && (
              <button
                onClick={() => setActiveTab('watchlist')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition font-medium ${
                  activeTab === 'watchlist'
                    ? 'bg-zinc-850 text-white border border-zinc-700/50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Bookmark size={15} />
                Watchlist
              </button>
            )}
          </div>

          {/* Mode Toggler (only on Home tab) */}
          {activeTab === 'home' && (
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/80 text-sm">
              <button
                onClick={() => setMode('movie')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition font-medium ${
                  mode === 'movie'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Film size={15} />
                Movies
              </button>
              <button
                onClick={() => setMode('book')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition font-medium ${
                  mode === 'book'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <BookOpen size={15} />
                Books
              </button>
            </div>
          )}
        </div>

        {/* User Profile / Auth Action */}
        <div className="flex items-center gap-3">
          {username ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-400">
                Hi, <strong className="text-zinc-250 font-semibold">{username}</strong>
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 text-zinc-300 hover:text-white px-4 py-2 rounded-xl text-sm transition"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 bg-zinc-105 hover:bg-zinc-200 text-zinc-950 font-semibold px-5 py-2 rounded-xl text-sm shadow-md transition duration-200"
            >
              <LogIn size={15} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
