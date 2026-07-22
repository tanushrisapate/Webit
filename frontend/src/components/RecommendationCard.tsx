import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Star, BookOpen, ExternalLink, Loader2, Play } from 'lucide-react';

interface RecommendationItem {
  id: number;
  title: string;
  rating: number;
  similarity: number;
  authors?: string;
  publisher?: string;
  isbn?: string;
}

interface RecommendationCardProps {
  item: RecommendationItem;
  type: 'movie' | 'book';
  isSaved: boolean;
  isLoggedIn: boolean;
  onToggleWatchlist: () => void;
}

interface ProviderInfo {
  name: string;
  url: string;
  isFlatrate: boolean;
}

/* ─── Provider brand config (official logo URLs) ─── */

interface ProviderBrand {
  logoUrl: string;
  bg: string;
  border: string;
  hoverBg: string;
  hoverBorder: string;
  text: string;
}

const getProviderBrand = (name: string): ProviderBrand => {
  const lower = name.toLowerCase();

  if (lower.includes('netflix')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    bg: 'rgba(229, 9, 20, 0.08)',
    border: 'rgba(229, 9, 20, 0.2)',
    hoverBg: 'rgba(229, 9, 20, 0.15)',
    hoverBorder: 'rgba(229, 9, 20, 0.4)',
    text: '#ff6b6b',
  };

  if (lower.includes('prime') || lower.includes('amazon')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
    bg: 'rgba(0, 168, 225, 0.08)',
    border: 'rgba(0, 168, 225, 0.2)',
    hoverBg: 'rgba(0, 168, 225, 0.15)',
    hoverBorder: 'rgba(0, 168, 225, 0.4)',
    text: '#4dc9f6',
  };

  if (lower.includes('disney')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    bg: 'rgba(17, 60, 207, 0.08)',
    border: 'rgba(17, 60, 207, 0.2)',
    hoverBg: 'rgba(17, 60, 207, 0.15)',
    hoverBorder: 'rgba(17, 60, 207, 0.4)',
    text: '#6b8aff',
  };

  if (lower.includes('hotstar')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Hotstar_logo.svg',
    bg: 'rgba(28, 167, 236, 0.08)',
    border: 'rgba(28, 167, 236, 0.2)',
    hoverBg: 'rgba(28, 167, 236, 0.15)',
    hoverBorder: 'rgba(28, 167, 236, 0.4)',
    text: '#4dc9f6',
  };

  if (lower.includes('apple')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Apple_TV_Plus_Logo.svg',
    bg: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.12)',
    hoverBg: 'rgba(255, 255, 255, 0.08)',
    hoverBorder: 'rgba(255, 255, 255, 0.25)',
    text: '#e0e0e0',
  };

  if (lower.includes('youtube') || lower.includes('google play')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    bg: 'rgba(255, 0, 0, 0.06)',
    border: 'rgba(255, 0, 0, 0.15)',
    hoverBg: 'rgba(255, 0, 0, 0.12)',
    hoverBorder: 'rgba(255, 0, 0, 0.35)',
    text: '#ff4444',
  };

  if (lower.includes('jio')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/JioCinema_logo_2023.png',
    bg: 'rgba(232, 55, 140, 0.08)',
    border: 'rgba(232, 55, 140, 0.2)',
    hoverBg: 'rgba(232, 55, 140, 0.15)',
    hoverBorder: 'rgba(232, 55, 140, 0.4)',
    text: '#f06eaa',
  };

  if (lower.includes('zee')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Zee5_logo.svg',
    bg: 'rgba(130, 48, 198, 0.08)',
    border: 'rgba(130, 48, 198, 0.2)',
    hoverBg: 'rgba(130, 48, 198, 0.15)',
    hoverBorder: 'rgba(130, 48, 198, 0.4)',
    text: '#b67aff',
  };

  if (lower.includes('sonyliv') || lower.includes('sony')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/SonyLIV_logo.svg',
    bg: 'rgba(0, 150, 214, 0.08)',
    border: 'rgba(0, 150, 214, 0.2)',
    hoverBg: 'rgba(0, 150, 214, 0.15)',
    hoverBorder: 'rgba(0, 150, 214, 0.4)',
    text: '#5bc0de',
  };

  if (lower.includes('mx player') || lower.includes('mxplayer')) return {
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/MX_Player_logo.svg',
    bg: 'rgba(247, 167, 27, 0.08)',
    border: 'rgba(247, 167, 27, 0.2)',
    hoverBg: 'rgba(247, 167, 27, 0.15)',
    hoverBorder: 'rgba(247, 167, 27, 0.4)',
    text: '#f7c948',
  };

  return {
    logoUrl: '',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.08)',
    hoverBg: 'rgba(255, 255, 255, 0.06)',
    hoverBorder: 'rgba(255, 255, 255, 0.15)',
    text: '#a0a0a0',
  };
};

/* ─── Match Badge color helper ─── */

const getMatchColor = (pct: number) => {
  if (pct >= 90) return { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#4ade80' };
  if (pct >= 70) return { bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.35)', text: '#fbbf24' };
  if (pct >= 50) return { bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.3)', text: '#fb923c' };
  return { bg: 'rgba(161, 161, 170, 0.1)', border: 'rgba(161, 161, 170, 0.25)', text: '#a1a1aa' };
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  type,
  isSaved,
  isLoggedIn,
  onToggleWatchlist,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loadingImage, setLoadingImage] = useState<boolean>(true);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(type === 'movie');
  const [isHovered, setIsHovered] = useState(false);
  const matchPercentage = Math.round(item.similarity * 100);
  const matchColor = getMatchColor(matchPercentage);

  // 1. Fetch poster/cover
  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      setLoadingImage(true);

      // Try OpenLibrary for books first
      if (type === 'book' && item.isbn && item.isbn.trim() !== '' && item.isbn !== 'nan') {
        const cleanedIsbn = item.isbn.trim();
        if (active) {
          setImageUrl(`https://covers.openlibrary.org/b/isbn/${cleanedIsbn}-M.jpg`);
          setLoadingImage(false);
        }
        return;
      }

      // Wikipedia API Fallback
      try {
        const queryTitle = type === 'movie' ? `${item.title} (film)` : item.title;
        const response = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&pilicense=any&generator=search&gsrsearch=${encodeURIComponent(
            queryTitle
          )}&gsrlimit=1&piprop=thumbnail&pithumbsize=400`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.query && data.query.pages) {
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
              if (active) {
                setImageUrl(pages[pageId].thumbnail.source);
                setLoadingImage(false);
              }
              return;
            }
          }
        }
      } catch (e) {
        console.error('Wikipedia image lookup failed:', e);
      }

      // Final Unsplash fallback
      if (active) {
        setImageUrl(
          type === 'movie'
            ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'
            : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80'
        );
        setLoadingImage(false);
      }
    };

    fetchImage();
    return () => { active = false; };
  }, [item.title, type, item.isbn]);

  // 2. Fetch ALL streaming providers for movies
  useEffect(() => {
    if (type !== 'movie') return;
    let active = true;

    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const response = await fetch(
          `https://imdb.iamidiotareyoutoo.com/justwatch?q=${encodeURIComponent(item.title)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.description && data.description.length > 0) {
            const movieMatch =
              data.description.find(
                (m: any) => m.title.trim().toLowerCase() === item.title.trim().toLowerCase()
              ) ||
              data.description.find(
                (m: any) =>
                  m.title.toLowerCase().includes(item.title.toLowerCase()) ||
                  item.title.toLowerCase().includes(m.title.toLowerCase())
              );

            if (movieMatch && movieMatch.offers && movieMatch.offers.length > 0) {
              const matches: ProviderInfo[] = [];
              const seenNames = new Set<string>();

              const flatrateOffers = movieMatch.offers.filter((o: any) =>
                o.type?.startsWith('FLATRATE')
              );
              const otherOffers = movieMatch.offers.filter(
                (o: any) => !o.type?.startsWith('FLATRATE')
              );
              const sortedOffers = [...flatrateOffers, ...otherOffers];

              for (const offer of sortedOffers) {
                const providerName = offer.name;
                if (offer.url && !offer.url.includes('justwatch.com')) {
                  if (!seenNames.has(providerName)) {
                    seenNames.add(providerName);
                    matches.push({
                      name: providerName,
                      url: offer.url,
                      isFlatrate: offer.type?.startsWith('FLATRATE') ?? false,
                    });
                  }
                }
              }
              if (active) setProviders(matches);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load JustWatch info:', e);
      } finally {
        if (active) setLoadingProviders(false);
      }
    };

    fetchProviders();
    return () => { active = false; };
  }, [item.title, type]);

  return (
    <div
      className="recommendation-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: isHovered
          ? 'rgba(39, 39, 42, 0.7)'
          : 'rgba(39, 39, 42, 0.35)',
        border: `1px solid ${isHovered ? 'rgba(113, 113, 122, 0.35)' : 'rgba(63, 63, 70, 0.4)'}`,
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(113, 113, 122, 0.1)'
          : '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div>
        {/* Cover / Poster image */}
        <div style={{
          position: 'relative',
          aspectRatio: '2/3',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgb(9, 9, 11)',
          border: '1px solid rgba(63, 63, 70, 0.5)',
          marginBottom: '14px',
        }}>
          {loadingImage ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#52525b' }} />
              <span style={{ fontSize: '9px', color: '#52525b' }}>Loading...</span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={item.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered ? 'scale(1.06)' : 'scale(1)',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  type === 'movie'
                    ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'
                    : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80';
              }}
            />
          )}

          {/* Match badge overlay */}
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: matchColor.bg,
            border: `1px solid ${matchColor.border}`,
            color: matchColor.text,
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            backdropFilter: 'blur(12px)',
            letterSpacing: '0.3px',
          }}>
            {matchPercentage}% Match
          </span>

          {/* Watchlist button overlay */}
          {isLoggedIn && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
              title={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: isSaved ? 'rgba(250, 204, 21, 0.2)' : 'rgba(0, 0, 0, 0.6)',
                border: `1px solid ${isSaved ? 'rgba(250, 204, 21, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: isSaved ? '#fbbf24' : '#a1a1aa',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            </button>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '13px',
          fontWeight: 700,
          color: isHovered ? '#ffffff' : '#e4e4e7',
          lineHeight: 1.4,
          marginBottom: '6px',
          transition: 'color 0.2s',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.title}
        </h3>

        {/* Rating Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>
            <Star size={11} fill="#f59e0b" stroke="#f59e0b" />
            <span>{item.rating.toFixed(1)}</span>
          </div>
          <span style={{ fontSize: '10px', color: '#52525b' }}>•</span>
          <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            {type === 'movie' ? 'Movie' : 'Book'}
          </span>
        </div>

        {/* Book metadata */}
        {type === 'book' && item.authors && (
          <div style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(63, 63, 70, 0.4)',
            fontSize: '11px',
            color: '#a1a1aa',
          }}>
            <p style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              <strong style={{ color: '#d4d4d8' }}>By:</strong> {item.authors}
            </p>
            {item.publisher && (
              <p style={{ fontSize: '10px', color: '#71717a', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.publisher}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Footer: OTT Links / Goodreads */}
      <div style={{
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(63, 63, 70, 0.4)',
      }}>
        {type === 'movie' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '30px' }}>
            {loadingProviders ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 0' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#52525b' }} />
                <span style={{ fontSize: '10px', color: '#52525b' }}>Finding streams...</span>
              </div>
            ) : providers.length > 0 ? (
              providers.map((p, idx) => {
                const brand = getProviderBrand(p.name);
                return (
                  <a
                    key={idx}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: `1px solid ${brand.border}`,
                      background: brand.bg,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: brand.text,
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = brand.hoverBg;
                      e.currentTarget.style.borderColor = brand.hoverBorder;
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = brand.bg;
                      e.currentTarget.style.borderColor = brand.border;
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {brand.logoUrl ? (
                          <img 
                            src={brand.logoUrl} 
                            alt={p.name} 
                            style={{ 
                              height: '14px', 
                              maxWidth: '75px',
                              objectFit: 'contain', 
                              display: 'block'
                            }} 
                          />
                        ) : (
                          <Play size={10} style={{ fill: 'currentColor' }} />
                        )}
                      </span>
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '10px',
                      }}>
                        {p.isFlatrate ? 'Stream' : 'Watch'} on {p.name}
                      </span>
                    </span>
                    <ExternalLink size={10} style={{ opacity: 0.5, flexShrink: 0, marginLeft: '4px' }} />
                  </a>
                );
              })
            ) : (
              <span style={{ fontSize: '10px', color: '#52525b', fontStyle: 'italic', textAlign: 'center', display: 'block', padding: '4px 0' }}>
                No streaming links found
              </span>
            )}
          </div>
        ) : (
          /* Books: Goodreads + Amazon */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a
              href={`https://www.goodreads.com/search?q=${encodeURIComponent(item.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#a1a1aa',
                background: 'rgba(9, 9, 11, 0.6)',
                border: '1px solid rgba(63, 63, 70, 0.4)',
                borderRadius: '10px',
                padding: '9px 0',
                textDecoration: 'none',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(113, 113, 122, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a1a1aa';
                e.currentTarget.style.borderColor = 'rgba(63, 63, 70, 0.4)';
              }}
            >
              <BookOpen size={11} />
              <span>View on Goodreads</span>
            </a>
            <a
              href={`https://www.amazon.in/s?k=${encodeURIComponent(item.title + ' book')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: '10px',
                padding: '9px 0',
                textDecoration: 'none',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.15)';
              }}
            >
              <span style={{ fontWeight: 700 }}>amazon</span>
              <span>Buy on Amazon</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
