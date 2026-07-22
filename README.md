# Webit 2.0 (The Modern Rewrite)

A web-based, hybrid recommendation engine that suggests movies and books using Content-Based Filtering (Cosine Similarity) and Collaborative Filtering. Built with a FastAPI backend, an SQLite database, JWT authentication, and a high-performance React + TypeScript + Tailwind CSS v4 frontend featuring official OTT streaming logo integrations.

---

## Features

### 🧠 Recommendation Engines
* **Content-Based Filtering (Movies)**: Matches movie overviews, genres, keywords, cast, and crew using stem-tokenized TF-IDF/Count Vectorization and Cosine Similarity matrices.
* **Hybrid Recommendation (Books)**: Combines book content metadata (authors, publishers, title tokens) with collaborative user ratings (via a custom pivot-table similarity calculation) for highly accurate suggestions.
* **Series-Dampening & Diversity Filter**: Caps the number of recommended books written by the same author to prevent series-heavy suggestions, introducing wider discovery.
* **Exact Matching**: Enforces strict case-insensitive title matching. The searched item itself is displayed as the first card with a guaranteed **100% Match** badge.

### 🔒 User & Security System
* **JWT Authentication**: Secure account system allowing registration and login with local SQLite storage.
* **Watchlist**: Persist and manage your favorite movies and books to your personal profile.

### 🎨 Premium User Experience
* **Minimal Monochrome Aesthetic**: Clean, responsive layout utilizing zinc colors, thin borders, and subtle animations.
* **Dynamic OTT Streaming Links**: Real-time fetching of streaming providers (Netflix, Prime Video, Disney+, Hotstar, Apple TV+, etc.) using JustWatch APIs, complete with official brand logos.
* **Interactive Hover Effects**: Cards lift up with deep shadows and scale posters on hover.
* **Staggered Animations**: Cards load sequentially using custom CSS keyframes.
* **Auto-completion**: Search suggestion dropdown matching titles in real-time.
* **Ambiguity Resolver**: Prompts the user with an interactive match picker if multiple movies or books share similar names.

---

## Tech Stack

### Backend
* **Python 3.13** (FastAPI backend with Uvicorn dev server)
* **SQLAlchemy & SQLite** (User profile, registration, and watchlist persistence)
* **JWT & Bcrypt** (Secure hashing and stateless session tokens)
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
│   ├── models.py         # DB schemas (User, WatchlistItem, etc.)
│   ├── main.py           # Router and recommendation endpoints
│   ├── preprocess_db.py  # Data preprocessor and DB migrator
│   └── test_api.py       # Mock API test runner
├── data/                 # Raw and processed datasets
│   ├── movies/           # TMDB movie datasets
│   ├── books/            # Book metadata and reviews
│   ├── processed/        # Pickled similarity matrices
│   └── webit.db          # SQLite Database file
├── frontend/             # Vite + React + TS Frontend
│   ├── src/
│   │   ├── components/   # Navbar, SearchBox, RecommendationCard, etc.
│   │   ├── App.tsx       # Main page state machine
│   │   └── index.css     # Styling system and keyframes
│   ├── index.html        # HTML shell
│   ├── vite.config.ts    # Configured with Tailwind v4 and proxy rules
│   └── package.json      # Frontend dependencies
├── main.py               # Main workspace entry point
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

# 2. Run preprocessing to build similarity models
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
