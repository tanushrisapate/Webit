from app import app, load_models

if __name__ == '__main__':
    # Initialize recommendations models
    load_models()
    # Run the Flask application
    app.run(debug=True, port=5050)
