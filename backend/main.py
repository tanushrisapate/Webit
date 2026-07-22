import os
import pickle
import numpy as np
import pandas as pd
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import engine, Base, get_db
from backend.models import User, Movie, Book, WatchlistItem
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Webit 2.0 API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for similarity models
movies_df = None
movies_similarity = None
books_df = None
books_similarity = None

def load_similarity_models():
    global movies_df, movies_similarity, books_df, books_similarity
    try:
        print("Loading movie models...")
        with open('data/processed/movie_list.pkl', 'rb') as f:
            movies_df = pickle.load(f)
        with open('data/processed/movie_similarity.pkl', 'rb') as f:
            movies_similarity = pickle.load(f)
        print("Movie models loaded.")
    except Exception as e:
        print(f"Error loading movie models: {e}")

    try:
        print("Loading book models...")
        with open('data/processed/book_list.pkl', 'rb') as f:
            books_df = pickle.load(f)
        with open('data/processed/book_similarity.pkl', 'rb') as f:
            books_similarity = pickle.load(f)
        print("Book models loaded.")
    except Exception as e:
        print(f"Error loading book models: {e}")

@app.on_event("startup")
def startup_event():
    load_similarity_models()

# Pydantic Schemas
class UserAuth(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class RecommendRequest(BaseModel):
    movie: Optional[str] = None
    book: Optional[str] = None
    id: Optional[int] = None

class WatchlistAddRequest(BaseModel):
    item_type: str  # 'movie' or 'book'
    item_id: int
    title: str

class WatchlistRemoveRequest(BaseModel):
    item_type: str
    item_id: int

# Auth Endpoints
@app.post("/api/auth/register", response_model=Token)
def register(user_data: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(username=user_data.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
def login(user_data: UserAuth, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "id": current_user.id}

# Metadata Endpoints
@app.get("/api/movies")
def get_movies(db: Session = Depends(get_db)):
    if movies_df is None:
        raise HTTPException(status_code=503, detail="Movie models not loaded.")
    return movies_df['title'].tolist()

@app.get("/api/books")
def get_books(db: Session = Depends(get_db)):
    if books_df is None:
        raise HTTPException(status_code=503, detail="Book models not loaded.")
    return books_df['Name'].tolist()

# Recommendation Endpoints
@app.post("/api/recommend/movie")
def recommend_movie(req: RecommendRequest, db: Session = Depends(get_db)):
    if movies_df is None or movies_similarity is None:
        raise HTTPException(status_code=503, detail="Movie models not loaded.")
    
    movie_id = req.id
    movie_title = (req.movie or "").strip()
    
    if movie_id is not None:
        matching_movies = movies_df[movies_df['id'] == int(movie_id)]
    else:
        matching_movies = movies_df[movies_df['title'].str.lower() == movie_title.lower()]
        if matching_movies.empty:
            matching_movies = movies_df[movies_df['title'].str.contains(movie_title, case=False, na=False)]
        if matching_movies.empty:
            raise HTTPException(status_code=404, detail=f"Movie '{movie_title}' not found.")
        
        if len(matching_movies) > 1:
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
                return {
                    "ambiguous": True,
                    "query": movie_title,
                    "matches": matches
                }
                
    movie_idx = matching_movies.index[0]
    movie_row = matching_movies.iloc[0]
    movie_name = movie_row['title']
    
    distances = movies_similarity[movie_idx]
    movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
    
    # First: include the queried movie itself with 100% match
    queried_item = {
        "id": int(movie_row['id']),
        "title": str(movie_row['title']),
        "rating": float(movie_row['vote_average']) if 'vote_average' in movie_row and not pd.isna(movie_row['vote_average']) else 0.0,
        "similarity": 1.0
    }
    
    recommendations = [queried_item]
    seen_ids = {int(movie_row['id'])}
    
    for i in movies_list:
        if i[0] == movie_idx:
            continue
        row = movies_df.iloc[i[0]]
        row_id = int(row['id'])
        if row_id in seen_ids:
            continue
        seen_ids.add(row_id)
        similarity = float(i[1])
            
        recommendations.append({
            "id": row_id,
            "title": str(row['title']),
            "rating": float(row['vote_average']) if 'vote_average' in row and not pd.isna(row['vote_average']) else 0.0,
            "similarity": similarity
        })
        if len(recommendations) == 6:  # 1 exact + 5 similar
            break
            
    return {
        "query": movie_name,
        "recommendations": recommendations
    }

@app.post("/api/recommend/book")
def recommend_book(req: RecommendRequest, db: Session = Depends(get_db)):
    if books_df is None or books_similarity is None:
        raise HTTPException(status_code=503, detail="Book models not loaded.")
    
    book_id = req.id
    book_title = (req.book or "").strip()
    
    if book_id is not None:
        matching_books = books_df[books_df['Id'] == int(book_id)]
    else:
        matching_books = books_df[books_df['Name'].str.lower() == book_title.lower()]
        if matching_books.empty:
            matching_books = books_df[books_df['Name'].str.contains(book_title, case=False, na=False)]
        if matching_books.empty:
            raise HTTPException(status_code=404, detail=f"Book '{book_title}' not found.")
        
        if len(matching_books) > 1:
            exact_subset = matching_books[matching_books['Name'].str.lower() == book_title.lower()]
            if len(exact_subset) == 1:
                matching_books = exact_subset
            else:
                matches = []
                for idx, row in matching_books.iterrows():
                    matches.append({
                        "id": int(row['Id']),
                        "title": str(row['Name']),
                        "authors": str(row['Authors']),
                        "publisher": str(row['Publisher']),
                        "rating": float(row['Rating']) if 'Rating' in row and not pd.isna(row['Rating']) else 0.0,
                        "isbn": str(row['ISBN']).strip() if 'ISBN' in row and not pd.isna(row['ISBN']) else ""
                    })
                return {
                    "ambiguous": True,
                    "query": book_title,
                    "matches": matches
                }
                
    book_idx = matching_books.index[0]
    book_row = matching_books.iloc[0]
    book_name = book_row['Name']
    
    distances = books_similarity[book_idx]
    books_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
    
    # First: include the queried book itself with 100% match
    queried_item = {
        "id": int(book_row['Id']),
        "title": str(book_row['Name']),
        "authors": str(book_row['Authors']),
        "publisher": str(book_row['Publisher']),
        "rating": float(book_row['Rating']) if 'Rating' in book_row and not pd.isna(book_row['Rating']) else 0.0,
        "isbn": str(book_row['ISBN']).strip() if 'ISBN' in book_row and not pd.isna(book_row['ISBN']) else "",
        "similarity": 1.0
    }
    
    recommendations = [queried_item]
    seen_ids = {int(book_row['Id'])}
    author_counts = {}
    max_author_limit = 2
    
    for i in books_list:
        if i[0] == book_idx:
            continue
        row = books_df.iloc[i[0]]
        row_id = int(row['Id'])
        if row_id in seen_ids:
            continue
        seen_ids.add(row_id)
        
        author_raw = str(row['Authors']).strip().split(',')[0].strip().lower()
        if author_raw:
            if author_counts.get(author_raw, 0) >= max_author_limit:
                continue
            author_counts[author_raw] = author_counts.get(author_raw, 0) + 1
            
        similarity = float(i[1])
            
        recommendations.append({
            "id": row_id,
            "title": str(row['Name']),
            "authors": str(row['Authors']),
            "publisher": str(row['Publisher']),
            "rating": float(row['Rating']) if 'Rating' in row and not pd.isna(row['Rating']) else 0.0,
            "isbn": str(row['ISBN']).strip() if 'ISBN' in row and not pd.isna(row['ISBN']) else "",
            "similarity": similarity
        })
        if len(recommendations) == 6:  # 1 exact + 5 similar
            break
            
    return {
        "query": book_name,
        "recommendations": recommendations
    }

# Watchlist Endpoints
@app.get("/api/watchlist")
def get_watchlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id).all()
    return [{
        "id": item.id,
        "item_type": item.item_type,
        "item_id": item.item_id,
        "title": item.title,
        "added_at": item.added_at
    } for item in items]

@app.post("/api/watchlist/add")
def add_to_watchlist(req: WatchlistAddRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if already in watchlist
    exists = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.item_type == req.item_type,
        WatchlistItem.item_id == req.item_id
    ).first()
    
    if exists:
        return {"message": "Item already in watchlist"}
        
    item = WatchlistItem(
        user_id=current_user.id,
        item_type=req.item_type,
        item_id=req.item_id,
        title=req.title
    )
    db.add(item)
    db.commit()
    return {"message": "Added to watchlist successfully"}

@app.post("/api/watchlist/remove")
def remove_from_watchlist(req: WatchlistRemoveRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.item_type == req.item_type,
        WatchlistItem.item_id == req.item_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in watchlist")
        
    db.delete(item)
    db.commit()
    return {"message": "Removed from watchlist successfully"}

# Mount frontend files at last
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
elif os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
