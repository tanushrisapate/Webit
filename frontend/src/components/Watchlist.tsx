import React from 'react';
import { BookmarkMinus, Film, ExternalLink } from 'lucide-react';

interface WatchlistItem {
  id: number;
  item_type: 'movie';
  item_id: number;
  title: string;
  added_at: string;
}

interface WatchlistProps {
  items: WatchlistItem[];
  onRemove: (id: number) => void;
  onSearchItem: (title: string) => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({ items, onRemove, onSearchItem }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-900/20 border border-zinc-850 rounded-2xl p-6 backdrop-blur-md max-w-lg mx-auto">
        <p className="text-zinc-400 text-sm">Your watchlist is empty.</p>
        <p className="text-[10px] text-zinc-500 mt-1">Search for movies and save them here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto mt-6">
      <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 tracking-wide uppercase">
        <Film size={15} />
        Saved Movies ({items.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-zinc-900/40 hover:bg-zinc-900/60 border border-zinc-850 rounded-xl p-4 transition duration-200"
          >
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="font-semibold text-zinc-100 truncate">{item.title}</h4>
              <span className="text-[10px] text-zinc-500">
                Added on {new Date(item.added_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSearchItem(item.title)}
                title="Find recommendations"
                className="p-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg transition"
              >
                <ExternalLink size={14} />
              </button>
              <button
                onClick={() => onRemove(item.item_id)}
                title="Remove"
                className="p-2 bg-zinc-950 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition"
              >
                <BookmarkMinus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
