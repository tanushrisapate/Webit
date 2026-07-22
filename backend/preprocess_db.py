import os
import pandas as pd
import numpy as np
import ast
import pickle
import glob
from nltk.stem.porter import PorterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from backend.database import Base, engine, SessionLocal
from backend.models import Movie, Book

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

def preprocess_books(db: Session):
    print("Starting book preprocessing...")
    
    book_files = glob.glob('data/books/book*.csv')
    if not book_files:
        print("Book metadata CSV files not found!")
        return
        
    dfs = []
    for file in book_files:
        try:
            dfs.append(pd.read_csv(file))
        except Exception as e:
            print(f"Error loading {file}: {e}")
            
    if not dfs:
        print("No valid book metadata files loaded.")
        return
        
    books = pd.concat(dfs, ignore_index=True)
    print(f"Total raw books loaded: {len(books)}")
    
    # Select columns
    books = books[['Id', 'Name', 'Publisher', 'CountsOfReview', 'Authors', 'Rating', 'ISBN']].copy()
    
    # Filter for popular/well-reviewed books to keep the model compact and high-quality
    books = books[books['CountsOfReview'] >= 200].copy()
    print(f"Filtered books count (CountsOfReview >= 200): {len(books)}")
    
    # Inject Kalam's autobiography if missing
    kalam_wings = {
        'Id': 634578,
        'Name': 'Wings of Fire: An Autobiography',
        'Publisher': 'Universities Press',
        'CountsOfReview': 1164,
        'Authors': 'A.P.J. Abdul Kalam, Arun Tiwari',
        'Rating': 4.25,
        'ISBN': ''
    }
    if not books['Name'].str.contains('Wings of Fire: An Autobiography', case=False, na=False).any():
        books = pd.concat([books, pd.DataFrame([kalam_wings])], ignore_index=True)
        print("Manually injected Wings of Fire: An Autobiography metadata.")
    
    books.dropna(subset=['Name'], inplace=True)
    books['Authors'] = books['Authors'].fillna('').astype(str)
    books['Publisher'] = books['Publisher'].fillna('').astype(str)
    
    # Construct tags for content-based filtering
    name_tokens = books['Name'].apply(lambda x: x.split())
    author_tokens = books['Authors'].apply(lambda x: [a.replace(" ", "").replace(".", "").replace(",", "").lower() for a in x.split(',')])
    publisher_tokens = books['Publisher'].apply(lambda x: [x.replace(" ", "").lower()] if x else [])
    
    books['tags'] = name_tokens + author_tokens + publisher_tokens
    books['tags'] = books['tags'].apply(lambda x: " ".join(x))
    books['tags'] = books['tags'].apply(lambda x: x.lower())
    books['tags'] = books['tags'].apply(stem)
    books.drop_duplicates(subset=['Id'], inplace=True)
    books.reset_index(drop=True, inplace=True)
    
    # Content Vectorization
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectors = cv.fit_transform(books['tags']).toarray()
    content_sim = cosine_similarity(vectors).astype(np.float32)
    
    # Collaborative Filtering Integration
    rating_files = glob.glob('data/books/user_rating_*.csv')
    hybrid_sim = content_sim.copy()
    
    if rating_files:
        r_dfs = []
        for file in rating_files:
            try:
                r_dfs.append(pd.read_csv(file))
            except Exception as e:
                print(f"Error loading ratings {file}: {e}")
        df_ratings = pd.concat(r_dfs, ignore_index=True)
        
        rating_map = {
            'it was amazing': 5,
            'really liked it': 4,
            'liked it': 3,
            'it was ok': 2,
            'did not like it': 1
        }
        df_ratings['Rating_num'] = df_ratings['Rating'].map(rating_map)
        df_ratings.dropna(subset=['Rating_num'], inplace=True)
        
        df_ratings_filtered = df_ratings[df_ratings['Name'].isin(books['Name'])].copy()
        pivot = df_ratings_filtered.pivot_table(index='Name', columns='ID', values='Rating_num').fillna(0)
        
        print(f"Pivot table shape: {pivot.shape}. Computing collaborative similarities...")
        collab_sim = cosine_similarity(pivot).astype(np.float32)
        collab_sim_df = pd.DataFrame(collab_sim, index=pivot.index, columns=pivot.index)
        
        alpha = 0.8
        book_to_idx = {name: idx for idx, name in enumerate(books['Name'])}
        N = len(books)
        
        for book_name in pivot.index:
            if book_name in book_to_idx:
                idx1 = book_to_idx[book_name]
                collab_row_series = collab_sim_df.loc[book_name]
                
                collab_row = np.zeros(N, dtype=np.float32)
                for other_name, score in collab_row_series.items():
                    if other_name in book_to_idx:
                        idx2 = book_to_idx[other_name]
                        collab_row[idx2] = score
                
                hybrid_sim[idx1] = alpha * collab_row + (1 - alpha) * content_sim[idx1]
    
    # Save to Database
    print("Loading books into SQLite database...")
    db.query(Book).delete()
    
    book_objects = []
    for _, row in books.iterrows():
        book_objects.append(Book(
            id=int(row['Id']),
            title=str(row['Name']),
            authors=str(row['Authors']),
            publisher=str(row['Publisher']),
            rating=float(row['Rating']) if not pd.isna(row['Rating']) else 0.0,
            isbn=str(row['ISBN']).strip() if not pd.isna(row['ISBN']) else ""
        ))
    db.bulk_save_objects(book_objects)
    db.commit()
    
    # Save processed similarity matrix
    books_export = books[['Id', 'Name', 'Authors', 'Publisher', 'Rating', 'ISBN']].copy()
    
    with open('data/processed/book_list.pkl', 'wb') as f:
        pickle.dump(books_export, f)
        
    with open('data/processed/book_similarity.pkl', 'wb') as f:
        pickle.dump(hybrid_sim, f)
        
    print(f"Books preprocessed successfully: {len(books_export)} books. Similarity matrix shape: {hybrid_sim.shape}")

if __name__ == '__main__':
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    db_session = SessionLocal()
    try:
        preprocess_movies(db_session)
        preprocess_books(db_session)
        print("All database loading & preprocessing finished successfully!")
    finally:
        db_session.close()
