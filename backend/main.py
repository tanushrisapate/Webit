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
from backend.models import User, Movie, WatchlistItem
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

def load_similarity_models():
    global movies_df, movies_similarity
    try:
        print("Loading movie models...")
        with open('data/processed/movie_list.pkl', 'rb') as f:
            movies_df = pickle.load(f)
        with open('data/processed/movie_similarity.pkl', 'rb') as f:
            movies_similarity = pickle.load(f)
        print("Movie models loaded.")
    except Exception as e:
        print(f"Error loading movie models: {e}")

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
    id: Optional[int] = None

class WatchlistAddRequest(BaseModel):
    item_type: str  # 'movie'
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
