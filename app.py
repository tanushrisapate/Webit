import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

# Global variables for models
movies_df = None
movies_similarity = None
books_df = None
books_similarity = None

def load_models():
    global movies_df, movies_similarity, books_df, books_similarity
    try:
        print("Loading movie models...")
        with open('data/processed/movie_list.pkl', 'rb') as f:
            movies_df = pickle.load(f)
        with open('data/processed/movie_similarity.pkl', 'rb') as f:
            movies_similarity = pickle.load(f)
        print("Movie models loaded successfully.")
    except Exception as e:
        print(f"Error loading movie models: {e}")

    try:
        print("Loading book models...")
        with open('data/processed/book_list.pkl', 'rb') as f:
            books_df = pickle.load(f)
        with open('data/processed/book_similarity.pkl', 'rb') as f:
            books_similarity = pickle.load(f)
        print("Book models loaded successfully.")
    except Exception as e:
        print(f"Error loading book models: {e}")

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/movies', methods=['GET'])
def get_movies():
    if movies_df is None:
        return jsonify({"error": "Movie models not loaded. Please run preprocessing."}), 503
    # Return list of movie titles
    titles = movies_df['title'].tolist()
    return jsonify(titles)

@app.route('/api/books', methods=['GET'])
def get_books():
    if books_df is None:
        return jsonify({"error": "Book models not loaded. Please run preprocessing."}), 503
    # Return list of book names
    names = books_df['Name'].tolist()
    return jsonify(names)

@app.route('/api/recommend/movie', methods=['POST'])
def recommend_movie():
    if movies_df is None or movies_similarity is None:
        return jsonify({"error": "Movie models not loaded."}), 503
    
    data = request.get_json()
    if not data or 'movie' not in data:
        return jsonify({"error": "Missing 'movie' field in request body."}), 400
    
    movie_title = data['movie'].strip()
    
    # Try case-insensitive exact match first
    matching_movies = movies_df[movies_df['title'].str.lower() == movie_title.lower()]
    
    if matching_movies.empty:
        # Try substring match
        matching_movies = movies_df[movies_df['title'].str.contains(movie_title, case=False, na=False)]
        
    if matching_movies.empty:
        return jsonify({"error": f"Movie '{movie_title}' not found in database."}), 404
    
    # Check for ambiguity (multiple matches)
    if len(matching_movies) > 1:
        # Check if there is exactly one exact match in the subset, use that
        exact_subset = matching_movies[matching_movies['title'].str.lower() == movie_title.lower()]
        if len(exact_subset) == 1:
            matching_movies = exact_subset
        else:
            matches = []
            for idx, row in matching_movies.iterrows():
                matches.append({
                    "title": str(row['title']),
                    "rating": float(row['vote_average']) if 'vote_average' in row and not pd.isna(row['vote_average']) else 0.0,
                    "id": int(row['id'])
                })
            return jsonify({
                "ambiguous": True,
                "matches": matches
            })
            
    # Get the unique match
    movie_idx = matching_movies.index[0]
    movie_name = matching_movies.iloc[0]['title']
    
    # Compute recommendations
    distances = movies_similarity[movie_idx]
    movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
    
    recommendations = []
    for i in movies_list:
        if i[0] == movie_idx:
            continue
        row = movies_df.iloc[i[0]]
        recommendations.append({
            "id": int(row['id']),
            "title": str(row['title']),
            "rating": float(row['vote_average']) if 'vote_average' in row and not pd.isna(row['vote_average']) else 0.0,
            "similarity": float(i[1])
        })
        if len(recommendations) == 5:
            break
            
    return jsonify({
        "query": movie_name,
        "recommendations": recommendations
    })

@app.route('/api/recommend/book', methods=['POST'])
def recommend_book():
    if books_df is None or books_similarity is None:
        return jsonify({"error": "Book models not loaded."}), 503
    
    data = request.get_json()
    if not data or 'book' not in data:
        return jsonify({"error": "Missing 'book' field in request body."}), 400
    
    book_title = data['book'].strip()
    
    # Try case-insensitive exact match first
    matching_books = books_df[books_df['Name'].str.lower() == book_title.lower()]
    
    if matching_books.empty:
        # Try substring match
        matching_books = books_df[books_df['Name'].str.contains(book_title, case=False, na=False)]
        
    if matching_books.empty:
        return jsonify({"error": f"Book '{book_title}' not found in database."}), 404
    
    # Check for ambiguity (multiple matches)
    if len(matching_books) > 1:
        # Check if there is exactly one exact match in the subset, use that
        exact_subset = matching_books[matching_books['Name'].str.lower() == book_title.lower()]
        if len(exact_subset) == 1:
            matching_books = exact_subset
        else:
            matches = []
            for idx, row in matching_books.iterrows():
                matches.append({
                    "title": str(row['Name']),
                    "authors": str(row['Authors']),
                    "publisher": str(row['Publisher']),
                    "rating": float(row['Rating']) if 'Rating' in row and not pd.isna(row['Rating']) else 0.0
                })
            return jsonify({
                "ambiguous": True,
                "matches": matches
            })
            
    # Get the unique match
    book_idx = matching_books.index[0]
    book_name = matching_books.iloc[0]['Name']
    
    # Compute recommendations
    distances = books_similarity[book_idx]
    books_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
    
    recommendations = []
    author_counts = {}
    max_author_limit = 2  # Caps recommendations by same author to prevent series-focus
    
    for i in books_list:
        if i[0] == book_idx:
            continue
        row = books_df.iloc[i[0]]
        
        # Diversity filter: Limit same author appearances to break series focus
        # Extract first author name to normalize comparison
        author_raw = str(row['Authors']).strip().split(',')[0].strip().lower()
        if author_raw:
            if author_counts.get(author_raw, 0) >= max_author_limit:
                continue
            author_counts[author_raw] = author_counts.get(author_raw, 0) + 1
            
        recommendations.append({
            "id": int(row['Id']),
            "title": str(row['Name']),
            "authors": str(row['Authors']),
            "publisher": str(row['Publisher']),
            "rating": float(row['Rating']) if 'Rating' in row and not pd.isna(row['Rating']) else 0.0,
            "similarity": float(i[1])
        })
        if len(recommendations) == 5:
            break
            
    return jsonify({
        "query": book_name,
        "recommendations": recommendations
    })

if __name__ == '__main__':
    # Initial load of models
    load_models()
    # Run application
    app.run(debug=True, port=5050)
