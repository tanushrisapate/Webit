# Webit —  Movie Recommendation Engine

A web-based, content-based movie recommendation engine that suggests films using TF-IDF vectorization and Cosine Similarity. Built with a FastAPI backend and a high-performance React + TypeScript + Tailwind CSS v4 frontend featuring real-time OTT streaming integrations.

---

## Features

### 🎬 Movie Recommendation Engine
* **Content-Based Filtering**: Matches movies by overview, genres, keywords, top-cast members, and director using stem-tokenized CountVectorization and Cosine Similarity matrices built on the TMDB 5000 dataset.
* **Exact Matching**: Enforces strict case-insensitive title matching. The searched movie itself is always displayed as the first card with a guaranteed **100% Match** badge.
* **Ambiguity Resolver**: If multiple movies share similar names, an interactive picker prompts the user to select the correct one before fetching recommendations.


### 🎨 Premium User Experience
* **Minimal Monochrome Aesthetic**: Clean, responsive layout utilizing zinc colors, thin borders, and subtle animations.
* **Dynamic OTT Streaming Links**: Real-time fetching of streaming providers (Netflix, Prime Video, Disney+, Hotstar, Apple TV+, JioCinema, ZEE5, SonyLIV, etc.) using JustWatch APIs, complete with official brand logos.
* **Interactive Hover Effects**: Cards lift up with deep shadows and scale posters on hover.
* **Auto-completion**: Search suggestion dropdown matching movie titles in real-time.

---

## Tech Stack

### Backend
* **Python 3.13** (FastAPI backend with Uvicorn dev server)
* **Pandas & NumPy** (Data wrangling and matrix operations)
* **Scikit-learn** (CountVectorizer and Cosine Similarity computations)

### Frontend
* **Vite + React 19 + TypeScript** (Modern component-based architecture)
* **Tailwind CSS v4** (Utility-first styling with `@tailwindcss/vite` plugin compilation)
* **Lucide Icons** (Visual indicators and UI symbols)

---

## Directory Structure

```text
webit/
├── backend/              # FastAPI application
│   ├── auth.py           # JWT helper and password hashing
│   ├── database.py       # SQLAlchemy engine and session helpers
│   ├── models.py         # DB schemas (User, Movie, WatchlistItem)
│   ├── main.py           # Router and recommendation endpoints
│   ├── preprocess_db.py  # Movie data preprocessor and DB migrator
│   └── test_api.py       # Mock API test runner
├── data/                 # Raw and processed datasets
│   ├── movies/           # TMDB 5000 movie datasets (CSV)
│   ├── processed/        # Pickled similarity matrices
│   └── webit.db          # SQLite Database file
├── frontend/             # Vite + React + TS Frontend
│   ├── src/
│   │   ├── components/   # Navbar, SearchBox, RecommendationCard, Watchlist, AuthModal
│   │   ├── App.tsx       # Main page state machine
│   │   └── index.css     # Styling system and keyframes
│   ├── index.html        # HTML shell
│   ├── vite.config.ts    # Configured with Tailwind v4 and proxy rules
│   └── package.json      # Frontend dependencies
├── main.py               # Main workspace entry point
├── preprocess.py         # Standalone preprocessing script
├── requirements.txt      # Project requirements
└── README.md             # Project documentation
```

---

## Quick Install

### Windows (PowerShell)
```powershell
# 1. Set up virtual environment and install dependencies
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Run preprocessing to build movie similarity models
python preprocess.py

# 3. Build frontend assets
cd frontend
npm install
npm run build
cd ..

# 4. Launch the application
python main.py
```

Then open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/movies` | Returns list of all movie titles for autocomplete |
| `POST` | `/api/recommend/movie` | Get 5 similar movie recommendations |

