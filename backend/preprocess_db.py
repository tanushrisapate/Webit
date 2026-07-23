import os
import pandas as pd
import numpy as np
import ast
import pickle
from nltk.stem.porter import PorterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from backend.database import Base, engine, SessionLocal
from backend.models import Movie

ps = PorterStemmer()

def stem(text):
    y = []
    for i in text.split():
        y.append(ps.stem(i))
    return " ".join(y)

def convert_genres_keywords(obj):
    try:
        list1 = []
        for i in ast.literal_eval(obj):
            list1.append(i['name'])
        return list1
    except:
        return []

def convert_cast(obj):
    try:
        list1 = []
        counter = 0
        for i in ast.literal_eval(obj):
            if counter != 3:
                list1.append(i['name'])
                counter += 1
            else:
                break
        return list1
    except:
        return []

def convert_crew(obj):
    try:
        list1 = []
        for i in ast.literal_eval(obj):
            if i['job'] == 'Director':
                list1.append(i['name'])
                break
        return list1
    except:
        return []

def preprocess_movies(db: Session):
    print("Starting movie preprocessing...")
    
    # Path relative to workspace root
    movies_path = 'data/movies/tmdb_5000_movies.csv'
    credits_path = 'data/movies/tmdb_5000_credits.csv'
    
    if not os.path.exists(movies_path) or not os.path.exists(credits_path):
        print("Movie CSV files not found!")
        return
        
    movies = pd.read_csv(movies_path)
    credits = pd.read_csv(credits_path)
    
    # Merge datasets
    movies = movies.merge(credits, on='title')
    
    # Select relevant columns
    movies = movies[['id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew', 'vote_average']]
    
    # Handle missing values
    movies.dropna(subset=['overview'], inplace=True)
    
    # Convert string JSON structures to lists
    movies['genres'] = movies['genres'].apply(convert_genres_keywords)
    movies['keywords'] = movies['keywords'].apply(convert_genres_keywords)
    movies['cast'] = movies['cast'].apply(convert_cast)
    movies['crew'] = movies['crew'].apply(convert_crew)
    
    # Split overview into list of words
    movies['overview'] = movies['overview'].apply(lambda x: x.split())
    
    # Remove spaces from elements to keep them as single tokens
    movies['genres'] = movies['genres'].apply(lambda x: [i.replace(" ", "") for i in x])
    movies['keywords'] = movies['keywords'].apply(lambda x: [i.replace(" ", "") for i in x])
    movies['cast'] = movies['cast'].apply(lambda x: [i.replace(" ", "") for i in x])
    movies['crew'] = movies['crew'].apply(lambda x: [i.replace(" ", "") for i in x])
    
    # Concatenate features into tag list
    movies['tags'] = movies['overview'] + movies['genres'] + movies['keywords'] + movies['cast'] + movies['crew']
    
    # Project final columns
    new_df = movies[['id', 'title', 'tags', 'vote_average']].copy()
    new_df.drop_duplicates(subset=['id'], inplace=True)
    new_df.reset_index(drop=True, inplace=True)
    
    # Join tags list into single space-separated string
    new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x))
    new_df['tags'] = new_df['tags'].apply(lambda x: x.lower())
    new_df['tags'] = new_df['tags'].apply(stem)
    
    # Vectorization
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectors = cv.fit_transform(new_df['tags']).toarray()
    similarity = cosine_similarity(vectors).astype(np.float32)
    
    # Save to Database
    print("Loading movies into SQLite database...")
    db.query(Movie).delete()
    
    movie_objects = []
    for _, row in new_df.iterrows():
        movie_objects.append(Movie(
            id=int(row['id']),
            title=str(row['title']),
            vote_average=float(row['vote_average']) if not pd.isna(row['vote_average']) else 0.0
        ))
    db.bulk_save_objects(movie_objects)
    db.commit()
    
    # Save processed similarity matrix
    os.makedirs('data/processed', exist_ok=True)
    movies_export = new_df[['id', 'title', 'vote_average']].copy()
    
    with open('data/processed/movie_list.pkl', 'wb') as f:
        pickle.dump(movies_export, f)
        
    with open('data/processed/movie_similarity.pkl', 'wb') as f:
        pickle.dump(similarity, f)
        
    print(f"Movies preprocessed successfully: {len(movies_export)} movies. Similarity matrix shape: {similarity.shape}")

if __name__ == '__main__':
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    db_session = SessionLocal()
    try:
        preprocess_movies(db_session)
        print("Movie preprocessing finished successfully!")
    finally:
        db_session.close()
