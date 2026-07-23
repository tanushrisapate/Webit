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

def load_models():
    global movies_df, movies_similarity
    try:
        print("Loading movie models...")
        with open('data/processed/movie_list.pkl', 'rb') as f:
            movies_df = pickle.load(f)
        with open('data/processed/movie_similarity.pkl', 'rb') as f:
            movies_similarity = pickle.load(f)
        print("Movie models loaded successfully.")
    except Exception as e:
        print(f"Error loading movie models: {e}")

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

@app.route('/api/recommend/movie', methods=['POST'])
def recommend_movie():
    if movies_df is None or movies_similarity is None:
        return jsonify({"error": "Movie models not loaded."}), 503
    
    data = request.get_json()
    if not data or ('movie' not in data and 'id' not in data):
        return jsonify({"error": "Missing 'movie' or 'id' field in request body."}), 400
    
    movie_id = data.get('id')
    movie_title = data.get('movie', '').strip()
    
    if movie_id is not None:
        matching_movies = movies_df[movies_df['id'] == int(movie_id)]
    else:
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
                    "query": movie_title,
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
        similarity = float(i[1])
        # Force 100% similarity for the exact same name
        if row['title'].lower() == movie_name.lower():
            similarity = 1.0
            
        recommendations.append({
            "id": int(row['id']),
            "title": str(row['title']),
            "rating": float(row['vote_average']) if 'vote_average' in row and not pd.isna(row['vote_average']) else 0.0,
            "similarity": similarity
        })
        if len(recommendations) == 5:
            break
            
    return jsonify({
        "query": movie_name,
        "recommendations": recommendations
    })

if __name__ == '__main__':
    # Initial load of models
    load_models()
    # Run application
    app.run(debug=True, port=5050)
