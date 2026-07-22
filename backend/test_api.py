import os
import sys

# Add root folder to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app, load_similarity_models
from backend.database import Base, engine, SessionLocal
from backend.models import User, WatchlistItem

# Make sure similarity models are loaded for testing
load_similarity_models()

client = TestClient(app)

def test_workflow():
    print("--- Starting Webit 2.0 Integration Tests ---")
    
    # 1. Register User
    username = "testuser_unique"
    password = "testpassword123"
    
    # Clean previous test user if exists
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            db.delete(user)
            db.commit()
    finally:
        db.close()

    print("Testing Registration...")
    reg_response = client.post("/api/auth/register", json={
        "username": username,
        "password": password
    })
    assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
    token_data = reg_response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    print("Registration OK. Token generated.")
    
    # 2. Login User
    print("Testing Login...")
    login_response = client.post("/api/auth/login", json={
        "username": username,
        "password": password
    })
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    assert "access_token" in login_response.json()
    print("Login OK.")
    
    # 3. Test Recommendations (Movies)
    print("Testing Movie Recommendations...")
    rec_movie_resp = client.post("/api/recommend/movie", json={
        "movie": "Avatar"
    })
    assert rec_movie_resp.status_code == 200, f"Movie recommendation failed: {rec_movie_resp.text}"
    data = rec_movie_resp.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    print(f"Movie recommendation OK: Query '{data['query']}' returned {len(data['recommendations'])} items.")
    movie_id = data["recommendations"][0]["id"]
    movie_title = data["recommendations"][0]["title"]
    
    # 4. Test Watchlist API
    headers = {"Authorization": f"Bearer {token}"}
    print("Testing Watchlist Add...")
    add_resp = client.post("/api/watchlist/add", json={
        "item_type": "movie",
        "item_id": movie_id,
        "title": movie_title
    }, headers=headers)
    assert add_resp.status_code == 200, f"Add to watchlist failed: {add_resp.text}"
    print("Watchlist Add OK.")
    
    print("Testing Watchlist Get...")
    get_resp = client.get("/api/watchlist", headers=headers)
    assert get_resp.status_code == 200, f"Get watchlist failed: {get_resp.text}"
    watchlist = get_resp.json()
    assert len(watchlist) == 1
    assert watchlist[0]["title"] == movie_title
    print("Watchlist Get OK.")
    
    print("Testing Watchlist Remove...")
    remove_resp = client.post("/api/watchlist/remove", json={
        "item_type": "movie",
        "item_id": movie_id
    }, headers=headers)
    assert remove_resp.status_code == 200, f"Remove from watchlist failed: {remove_resp.text}"
    print("Watchlist Remove OK.")
    
    print("Testing Watchlist Empty Check...")
    get_resp_empty = client.get("/api/watchlist", headers=headers)
    assert len(get_resp_empty.json()) == 0
    print("Watchlist Empty Check OK.")
    
    print("\n--- ALL TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    test_workflow()
