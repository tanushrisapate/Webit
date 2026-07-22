# Webit

A web-based, hybrid recommendation engine that suggests movies and books using Content-Based Filtering (Cosine Similarity) and Collaborative Filtering. It features a premium, responsive glassmorphic user interface with real-time autocompletion and interactive resolution of ambiguous queries.

---

## Features

### Recommendation Engines
* **Content-Based Filtering (Movies)**: Matches movie overview, genres, keywords, cast, and crew using stem-tokenized TF-IDF/Count Vectorization and Cosine Similarity matrices.
* **Hybrid Recommendation (Books)**: Combines book content metadata (authors, publishers, title tokens) with collaborative user ratings (via a custom pivot-table similarity calculation) for highly accurate suggestions.
* **Series-Dampening & Diversity Filter**: Caps the number of recommended books written by the same author to prevent series-heavy suggestions, introducing wider discovery.

### User Experience
* **Dual Modes**: Smooth, native-feeling toggle between Movie and Book recommendation modes.
* **Auto-completion**: Instant search box suggestions matching title names in real-time as the user types.
* **Ambiguity Resolver**: Prompts the user with an interactive match picker if multiple movies or books share similar or identical names.
* **Glassmorphic Design**: Clean, modern dark UI styling with smooth transitions, glassmorphism backdrops, and active hover micro-animations.

---

## Tech Stack

### Backend
* **Python 3.10+** (Environment and dependency management)
* **Flask & Flask-CORS** (RESTful API endpoints and static file serving)
* **Pandas & NumPy** (Data wrangling and matrix operations)
* **NLTK** (PorterStemmer token normalization)
* **Scikit-learn** (CountVectorizer and Cosine Similarity computations)

### Frontend
* **Vanilla HTML5 & CSS3** (Responsive CSS grid, custom variables, and glassmorphic styling)
* **Vanilla JavaScript** (State management, autocomplete, and asynchronous API integration)
* **Font Awesome Icons** (Visual indicators and UI symbols)

---

## Quick Install

### Windows (PowerShell)
```powershell
# Set up virtual environment and install dependencies
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run preprocessing to generate similarity models
python preprocess.py

# Launch the application
python main.py
```

### Linux / macOS
```bash
# Set up virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run preprocessing to generate similarity models
python preprocess.py

# Launch the application
python main.py
```

Then open **[http://localhost:5050](http://localhost:5050)** in your browser.

---

## Development Setup

### 1. Preprocessing Pipeline
The application requires preprocessed vector models before running. When running `preprocess.py`:
* **Movies**: Merges TMDB datasets (`tmdb_5000_movies.csv` & `tmdb_5000_credits.csv`), extracts key tags (genres, keywords, cast, crew, overview), stems the tokens, and exports `movie_list.pkl` and a `float32` similarity matrix `movie_similarity.pkl`.
* **Books**: Merges book metadata and user ratings, builds a user-book rating pivot matrix to run collaborative filtering, blends it with content-based features using a dynamic blend factor ($\alpha = 0.8$), and exports `book_list.pkl` and `book_similarity.pkl`.

```bash
python preprocess.py
```

### 2. Launching Server
```bash
python main.py
```
Starts the Flask server on port `5050`.

---

## Directory Structure

```text
webit/
├── data/                 # Raw and processed datasets
│   ├── movies/           # TMDB movie datasets
│   ├── books/            # Book metadata and user reviews
│   └── processed/        # Pickled similarity matrices & models
├── frontend/             # Front-end static assets
│   ├── index.html        # HTML layout
│   ├── style.css         # Styling system
│   └── app.js            # Frontend interactions and API integrations
├── app.py                # Flask application routes
├── preprocess.py         # Data preprocessing pipeline
├── main.py               # Main entry point to run the application
├── requirements.txt      # Project dependencies
└── README.md             # Project documentation
```
