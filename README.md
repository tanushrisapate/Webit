# Webit | Movie & Book Recommendation System

Webit is a web-based, hybrid recommendation engine that suggests movies and books using Content-Based Filtering (Cosine Similarity) and Collaborative Filtering. The backend is built using Flask, while the frontend is a modern, responsive user interface designed with glassmorphism styling and auto-completion.

---

## Features

- **Dual Modes**: Smooth toggling between Movie and Book recommendation modes.
- **Auto-completion**: Fast search box suggestions matching the movie or book title as you type.
- **Ambiguity Resolver**: Prompts the user to select the specific match if there are multiple movies or books with similar/identical names.
- **Hybrid Recommendations (Books)**: Combines book content metadata (authors, publishers, title tokens) with collaborative user ratings to suggest highly relevant books.
- **Series-Dampening (Books)**: Implements filters to limit recommendations by the same author to prevent series-heavy suggestions, introducing more diversity.
- **Glassmorphic UI**: Clean, premium dark UI with smooth transitions and hover micro-animations.

---

## Tech Stack

- **Backend**: Python, Flask, Flask-CORS, Pandas, NumPy, NLTK, Scikit-learn
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), Vanilla JavaScript, Font Awesome Icons

---

## Getting Started

### 1. Prerequisites
Ensure you have Python 3.10+ installed.

### 2. Setup Virtual Environment
Clone or navigate to the project directory and set up a virtual environment:

```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.venv\Scripts\activate.bat
# On macOS/Linux:
source .venv/bin/activate
```

### 3. Install Dependencies
Install all required libraries via pip:

```bash
pip install -r requirements.txt
```

### 4. Run Preprocessing
Build the recommendation engines by processing the datasets (it generates the vectorized similarity matrices and metadata dumps):

```bash
python preprocess.py
```

*Note: Preprocessed files will be saved in `data/processed/`.*

### 5. Run the Application
Start the Flask application using the main entry point:

```bash
python main.py
```

The application will start on: [http://127.0.0.1:5050](http://127.0.0.1:5050)

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
